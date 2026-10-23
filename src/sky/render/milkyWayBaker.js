// Bakes the Milky Way into an sRGB cube map in the equatorial frame. The sky only ever
// rotates, so the galaxy is computed once, in tiles spread over a few frames, and then
// sampled with a single texture lookup per pixel.

import fullscreenVert from "./shaders/fullscreen.vert?raw";
import milkyWayFrag from "./shaders/milkyway.frag?raw";
import { createProgram } from "./gl.js";
import { EQUATORIAL_TO_GALACTIC } from "../astro.js";
import { packMilkyWayFeatures } from "../milkyway.js";

const TILES_PER_SIDE = 2;

const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, byte) => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});

const createCubeTexture = (gl, size) => {
  const texture = gl.createTexture();
  const levels = Math.floor(Math.log2(size)) + 1;
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, levels, gl.SRGB8_ALPHA8, size, size);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

const createFeatureTexture = (gl) => {
  const { data, count } = packMilkyWayFeatures();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, count, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return { texture, count };
};

export const createMilkyWayBaker = (gl, { size }) => {
  const program = createProgram(gl, fullscreenVert, milkyWayFrag);
  const features = createFeatureTexture(gl);
  const framebuffer = gl.createFramebuffer();
  const preview = { texture: createCubeTexture(gl, 64), size: 64 };
  const full = { texture: createCubeTexture(gl, size), size };
  const tileCount = 6 * TILES_PER_SIDE * TILES_PER_SIDE;
  let nextTile = 0;

  const renderTile = (target, face, tileX, tileY, tilesPerSide) => {
    const tileSize = target.size / tilesPerSide;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
      target.texture,
      0
    );
    gl.viewport(0, 0, target.size, target.size);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(tileX * tileSize, tileY * tileSize, tileSize, tileSize);
    gl.uniform1i(program.uniforms.uFace, face);
    gl.uniform1f(program.uniforms.uSize, target.size);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  };

  const begin = () => {
    gl.useProgram(program.program);
    gl.disable(gl.BLEND);
    gl.uniformMatrix3fv(program.uniforms.uEquatorialToGalactic, false, EQUATORIAL_TO_GALACTIC);
    gl.uniform1i(program.uniforms.uFeatureCount, features.count);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, features.texture);
    gl.uniform1i(program.uniforms.uFeatures, 0);
  };

  const finish = (target) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, target.texture);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  };

  // A tiny preview is ready on the first frame; the full map replaces it once baked.
  begin();
  for (let face = 0; face < 6; face += 1) {
    renderTile(preview, face, 0, 0, 1);
  }
  finish(preview);

  return {
    get texture() {
      return nextTile >= tileCount ? full.texture : preview.texture;
    },
    get done() {
      return nextTile >= tileCount;
    },
    // Renders up to `tiles` more tiles; returns true once the full map is ready.
    step: (tiles = 4) => {
      if (nextTile >= tileCount) {
        return true;
      }

      begin();
      const end = Math.min(tileCount, nextTile + tiles);

      for (; nextTile < end; nextTile += 1) {
        const face = Math.floor(nextTile / (TILES_PER_SIDE * TILES_PER_SIDE));
        const tile = nextTile % (TILES_PER_SIDE * TILES_PER_SIDE);
        renderTile(full, face, tile % TILES_PER_SIDE, Math.floor(tile / TILES_PER_SIDE), TILES_PER_SIDE);
      }

      if (nextTile >= tileCount) {
        finish(full);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      return nextTile >= tileCount;
    },
    // Starts reading a small mip level back as linear luminance per texel (six faces,
    // rows from t = 0) so field stars can be scattered where the galaxy is bright. The
    // copy goes through a pixel-pack buffer and a fence, so the GPU never stalls; poll()
    // returns null until the data has arrived.
    readLuminanceAsync: (targetSize = 128) => {
      const level = Math.max(0, Math.round(Math.log2(full.size / targetSize)));
      const levelSize = full.size >> level;
      const texels = levelSize * levelSize;
      const buffer = gl.createBuffer();

      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, texels * 4 * 6, gl.STREAM_READ);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      for (let face = 0; face < 6; face += 1) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, full.texture, level);
        gl.readPixels(0, 0, levelSize, levelSize, gl.RGBA, gl.UNSIGNED_BYTE, face * texels * 4);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();

      return {
        poll: () => {
          if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) {
            return null;
          }

          gl.deleteSync(fence);
          const pixels = new Uint8Array(texels * 4 * 6);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          gl.deleteBuffer(buffer);

          const luminance = new Float32Array(texels * 6);
          for (let texel = 0; texel < texels * 6; texel += 1) {
            const offset = texel * 4;
            luminance[texel] =
              0.2126 * SRGB_TO_LINEAR[pixels[offset]] +
              0.7152 * SRGB_TO_LINEAR[pixels[offset + 1]] +
              0.0722 * SRGB_TO_LINEAR[pixels[offset + 2]];
          }

          return { luminance, size: levelSize };
        },
      };
    },
    dispose: () => {
      gl.deleteProgram(program.program);
      gl.deleteTexture(features.texture);
      gl.deleteTexture(preview.texture);
      gl.deleteTexture(full.texture);
      gl.deleteFramebuffer(framebuffer);
    },
  };
};
