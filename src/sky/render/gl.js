// Minimal WebGL2 helpers: shader compilation with readable errors, uniform lookup and
// render targets.

import common from "./shaders/common.glsl?raw";

const withIncludes = (source) => source.replace('#include "common.glsl"', common);

const describeError = (gl, shader, source) => {
  const log = gl.getShaderInfoLog(shader) ?? "";
  const numbered = source
    .split("\n")
    .map((line, index) => `${String(index + 1).padStart(4)}  ${line}`)
    .join("\n");
  return `${log}\n${numbered}`;
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const message = describeError(gl, shader, source);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed:\n${message}`);
  }

  return shader;
};

export const createProgram = (gl, vertexSource, fragmentSource) => {
  const program = gl.createProgram();
  const vertex = compileShader(gl, gl.VERTEX_SHADER, withIncludes(vertexSource));
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, withIncludes(fragmentSource));
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`Program link failed:\n${gl.getProgramInfoLog(program)}`);
  }

  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  for (let index = 0; index < count; index += 1) {
    const { name } = gl.getActiveUniform(program, index);
    uniforms[name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, name);
  }

  return { program, uniforms };
};

export const createRenderTarget = (gl, width, height, { filter = gl.NEAREST } = {}) => {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();

  const allocate = (nextWidth, nextHeight) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, nextWidth, nextHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    target.width = nextWidth;
    target.height = nextHeight;
  };

  const target = {
    texture,
    framebuffer,
    width: 0,
    height: 0,
    resize: (nextWidth, nextHeight) => {
      if (nextWidth !== target.width || nextHeight !== target.height) {
        allocate(nextWidth, nextHeight);
      }
    },
    dispose: () => {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    },
  };

  allocate(width, height);
  return target;
};

export const createStaticBuffer = (gl, data) => {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};
