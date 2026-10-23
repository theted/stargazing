// Draws a frame. All GPU resources are created up front in createRenderer; draw() only
// binds, sets uniforms and issues draw calls from the per-frame state it is handed.

import fullscreenVert from "./shaders/fullscreen.vert?raw";
import skyFrag from "./shaders/sky.frag?raw";
import starsVert from "./shaders/stars.vert?raw";
import starsFrag from "./shaders/stars.frag?raw";
import dustVert from "./shaders/dust.vert?raw";
import dustFrag from "./shaders/dust.frag?raw";
import trailsVert from "./shaders/trails.vert?raw";
import trailsFrag from "./shaders/trails.frag?raw";
import meteorVert from "./shaders/meteor.vert?raw";
import meteorFrag from "./shaders/meteor.frag?raw";
import auroraFrag from "./shaders/aurora.frag?raw";
import { createProgram, createRenderTarget, createStaticBuffer } from "./gl.js";
import { createMilkyWayBaker } from "./milkyWayBaker.js";
import { DUST_STAR_BYTES, STAR_STRIDE } from "../stars.js";
import { EQUATORIAL_TO_GALACTIC } from "../astro.js";
import { mat3Transpose } from "../math.js";

const GALACTIC_TO_EQUATORIAL = mat3Transpose(EQUATORIAL_TO_GALACTIC);
const QUAD_CORNERS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const FLOAT_BYTES = 4;
const METEOR_SEGMENTS = 40;
export const MAX_DYNAMIC_STARS = 8;

const createStarVao = (gl, cornerBuffer, instanceBuffer) => {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  const stride = STAR_STRIDE * FLOAT_BYTES;
  const attributes = [
    [1, 3, 0],
    [2, 1, 3],
    [3, 3, 4],
    [4, 1, 7],
  ];

  attributes.forEach(([location, size, offset]) => {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * FLOAT_BYTES);
    gl.vertexAttribDivisor(location, 1);
  });

  gl.bindVertexArray(null);
  return vao;
};

const createTrailStrip = (segments) => {
  const strip = new Float32Array((segments + 1) * 4);
  for (let column = 0; column <= segments; column += 1) {
    strip.set([column, -1, column, 1], column * 4);
  }
  return strip;
};

// Same layout as the star quads: the strip replaces the corner buffer.
const createTrailVao = createStarVao;

const createDustVao = (gl, buffer) => {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.SHORT, true, DUST_STAR_BYTES, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.UNSIGNED_BYTE, true, DUST_STAR_BYTES, 6);
  gl.bindVertexArray(null);
  return vao;
};

export const createRenderer = (gl, { bakeSize, brightStars, fieldStars, trailSegments }) => {
  const skyProgram = createProgram(gl, fullscreenVert, skyFrag);
  const starProgram = createProgram(gl, starsVert, starsFrag);
  const dustProgram = createProgram(gl, dustVert, dustFrag);
  const trailProgram = createProgram(gl, trailsVert, trailsFrag);
  const meteorProgram = createProgram(gl, meteorVert, meteorFrag);
  const auroraProgram = createProgram(gl, fullscreenVert, auroraFrag);
  const auroraTarget = createRenderTarget(gl, 1, 1, { filter: gl.LINEAR });
  const baker = createMilkyWayBaker(gl, { size: bakeSize });
  const starTarget = createRenderTarget(gl, 1, 1);
  const emptyVao = gl.createVertexArray();

  const cornerBuffer = createStaticBuffer(gl, QUAD_CORNERS);
  const brightBuffer = createStaticBuffer(gl, brightStars.data);
  const fieldBuffer = createStaticBuffer(gl, fieldStars.data);
  let fieldCount = fieldStars.count;
  const brightVao = createStarVao(gl, cornerBuffer, brightBuffer);
  const fieldVao = createStarVao(gl, cornerBuffer, fieldBuffer);
  const dustBuffer = createStaticBuffer(gl, new Uint8Array(DUST_STAR_BYTES));
  const dustVao = createDustVao(gl, dustBuffer);
  let dustCount = 0;
  const trailStripBuffer = createStaticBuffer(gl, createTrailStrip(trailSegments));
  const trailVao = createTrailVao(gl, trailStripBuffer, brightBuffer);

  // Meteor ribbons share one strip; meteor heads and satellites are a handful of
  // star instances rewritten every frame.
  const meteorStripBuffer = createStaticBuffer(gl, createTrailStrip(METEOR_SEGMENTS));
  const meteorVao = gl.createVertexArray();
  gl.bindVertexArray(meteorVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, meteorStripBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const dynamicBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_DYNAMIC_STARS * STAR_STRIDE * FLOAT_BYTES, gl.DYNAMIC_DRAW);
  const dynamicVao = createStarVao(gl, cornerBuffer, dynamicBuffer);

  // The aurora is soft enough to render at half resolution.
  const drawAurora = (frame) => {
    const width = Math.max(1, Math.round(frame.width / 2));
    const height = Math.max(1, Math.round(frame.height / 2));
    auroraTarget.resize(width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, auroraTarget.framebuffer);
    gl.viewport(0, 0, width, height);
    const u = auroraProgram.uniforms;
    gl.useProgram(auroraProgram.program);
    gl.uniform2f(u.uCenter, frame.cx * (width / frame.width), frame.cy * (height / frame.height));
    gl.uniform1f(u.uScale, frame.scale * (width / frame.width));
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniformMatrix3fv(u.uViewToHorizontal, false, frame.viewToHorizontal);
    gl.uniform1f(u.uTime, frame.auroraTime);
    gl.uniform1f(u.uStrength, frame.auroraStrength);
    gl.uniform1f(u.uHeading, frame.auroraHeading);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const drawDust = (frame) => {
    if (dustCount === 0) return;
    const u = dustProgram.uniforms;
    gl.useProgram(dustProgram.program);
    gl.uniformMatrix3fv(u.uEquatorialToView, false, frame.equatorialToView);
    gl.uniform3fv(u.uZenith, frame.zenith);
    gl.uniform2f(u.uResolution, frame.width, frame.height);
    gl.uniform2f(u.uCenter, frame.cx, frame.cy);
    gl.uniform1f(u.uScale, frame.scale);
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniform1f(u.uReferenceMagnitude, frame.referenceMagnitude + frame.dustBoost - frame.trailDimming * 1.6);
    gl.uniform3fv(u.uExtinction, frame.extinction);
    gl.uniform1f(u.uSigma, frame.sigma);
    gl.uniform1f(u.uDust, 0.9);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, baker.texture);
    gl.uniform1i(u.uMilkyWay, 0);
    gl.bindVertexArray(dustVao);
    gl.drawArrays(gl.POINTS, 0, dustCount);
  };

  const drawTrails = (frame) => {
    if (frame.trailAngle <= 1e-4) return;
    const u = trailProgram.uniforms;
    gl.useProgram(trailProgram.program);
    gl.uniformMatrix3fv(u.uEquatorialToView, false, frame.equatorialToView);
    gl.uniform3fv(u.uZenith, frame.zenith);
    gl.uniform2f(u.uResolution, frame.width, frame.height);
    gl.uniform2f(u.uCenter, frame.cx, frame.cy);
    gl.uniform1f(u.uScale, frame.scale);
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniform1f(u.uReferenceMagnitude, frame.referenceMagnitude);
    gl.uniform3fv(u.uExtinction, frame.extinction);
    gl.uniform1f(u.uSigma, frame.sigma);
    gl.uniform1f(u.uSegments, trailSegments);
    gl.uniform1f(u.uTrailAngle, frame.trailAngle);
    gl.uniform1f(u.uTrailGain, frame.trailGain);
    gl.uniform1f(u.uTrailFade, frame.trailFade);
    gl.uniform1f(u.uMaxSpan, 0.25 * Math.hypot(frame.width, frame.height));
    gl.bindVertexArray(trailVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (trailSegments + 1) * 2, Math.min(frame.trailStars, brightStars.count));
  };

  const drawMeteors = (frame) => {
    if (frame.meteors.length === 0) return;
    const u = meteorProgram.uniforms;
    gl.useProgram(meteorProgram.program);
    gl.uniformMatrix3fv(u.uHorizontalToView, false, frame.horizontalToView);
    gl.uniform2f(u.uResolution, frame.width, frame.height);
    gl.uniform2f(u.uCenter, frame.cx, frame.cy);
    gl.uniform1f(u.uScale, frame.scale);
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniform3fv(u.uExtinction, frame.extinction);
    gl.uniform1f(u.uSigma, frame.sigma * 1.15);
    gl.uniform1f(u.uSegments, METEOR_SEGMENTS);
    gl.bindVertexArray(meteorVao);

    for (const meteor of frame.meteors) {
      gl.uniform3fv(u.uStart, meteor.start);
      gl.uniform3fv(u.uEnd, meteor.end);
      gl.uniform1f(u.uHead, meteor.head);
      gl.uniform1f(u.uWake, meteor.wake);
      gl.uniform1f(u.uBrightness, meteor.brightness);
      gl.uniform1f(u.uTrain, meteor.train);
      gl.uniform1f(u.uTrainSigma, frame.sigma * meteor.trainWidth);
      gl.uniform1f(u.uHue, meteor.hue);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, (METEOR_SEGMENTS + 1) * 2);
    }
  };

  const drawStars = (frame) => {
    const u = starProgram.uniforms;
    gl.useProgram(starProgram.program);
    gl.uniformMatrix3fv(u.uEquatorialToView, false, frame.equatorialToView);
    gl.uniform3fv(u.uZenith, frame.zenith);
    gl.uniform2f(u.uResolution, frame.width, frame.height);
    gl.uniform2f(u.uCenter, frame.cx, frame.cy);
    gl.uniform1f(u.uScale, frame.scale);
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniform3fv(u.uExtinction, frame.extinction);
    gl.uniform1f(u.uSigma, frame.sigma);
    gl.uniform1f(u.uSkirtSigma, frame.skirtSigma);
    gl.uniform1f(u.uGlowSigma, frame.glowSigma);
    gl.uniform2fv(u.uHaloRatio, frame.haloRatio);
    gl.uniform2fv(u.uHaloKnee, frame.haloKnee);
    gl.uniform1f(u.uMaxRadius, frame.maxRadius);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uTwinkle, frame.twinkle);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, baker.texture);
    gl.uniform1i(u.uMilkyWay, 0);

    // Faint field stars hide behind the same dust lanes that darken the galaxy, and are
    // lifted a little so the band reads as a river of stars rather than a cloud.
    gl.uniform1f(u.uReferenceMagnitude, frame.referenceMagnitude + frame.fieldBoost - frame.trailDimming);
    gl.uniform1f(u.uDust, frame.layers.milkyWay ? 0.85 : 0);
    if (fieldCount > 0) {
      gl.bindVertexArray(fieldVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, fieldCount);
    }

    gl.uniform1f(u.uDust, 0);
    gl.uniform1f(u.uReferenceMagnitude, frame.referenceMagnitude);
    gl.bindVertexArray(brightVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, brightStars.count);

    if (frame.dynamicCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.dynamicStars, 0, frame.dynamicCount * STAR_STRIDE);
      gl.uniform1f(u.uTwinkle, 0);
      gl.bindVertexArray(dynamicVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, frame.dynamicCount);
    }
  };

  const drawSky = (frame) => {
    const u = skyProgram.uniforms;
    const place = frame.place;
    gl.useProgram(skyProgram.program);
    gl.uniform2f(u.uResolution, frame.width, frame.height);
    gl.uniform2f(u.uCenter, frame.cx, frame.cy);
    gl.uniform1f(u.uScale, frame.scale);
    gl.uniform1f(u.uAlpha, frame.alpha);
    gl.uniformMatrix3fv(u.uViewToHorizontal, false, frame.viewToHorizontal);
    gl.uniformMatrix3fv(u.uHorizontalToEquatorial, false, frame.horizontalToEquatorial);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uExposure, frame.exposure);
    gl.uniform1f(u.uFade, frame.fade);
    gl.uniform1f(u.uMilkyWayGain, frame.layers.milkyWay ? frame.milkyWayGain : 0);
    gl.uniform1f(u.uTrailAngle, frame.trailAngle);
    gl.uniform3fv(u.uExtinction, frame.extinction);
    gl.uniform1f(u.uAtmosphereOn, frame.layers.atmosphere ? 1 : 0);
    gl.uniform1f(u.uSkyGlow, place.skyGlow);
    gl.uniform2fv(u.uAirglow, place.airglow);
    gl.uniform4fv(u.uDome, place.dome);
    gl.uniform3fv(u.uDomeColor, place.domeColor);
    gl.uniform1f(u.uLandscapeOn, frame.layers.landscape ? 1 : 0);
    gl.uniform1f(u.uLandscapeTop, place.landscapeTop);
    gl.uniform4fv(u.uRidge, place.ridge);
    gl.uniform4fv(u.uRidgeColor, place.ridgeColor);
    gl.uniform3fv(u.uRidgeSeed, place.ridgeSeed);
    gl.uniform4fv(u.uCone, place.cone);
    gl.uniform4fv(u.uTrees, place.trees);
    gl.uniform1f(u.uTreeWidth, place.treeWidth);
    gl.uniform3fv(u.uTreeColor, place.treeColor);
    gl.uniform3fv(u.uGroundLight, frame.groundLight);
    gl.uniform1f(u.uVignette, frame.vignette);
    gl.uniform1f(u.uAuroraOn, frame.auroraStrength > 0 ? 1 : 0);
    gl.uniform1i(u.uDebug, frame.debug ?? 0);
    gl.uniformMatrix3fv(u.uGalacticToEquatorial, false, GALACTIC_TO_EQUATORIAL);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, baker.texture);
    gl.uniform1i(u.uMilkyWay, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, starTarget.texture);
    gl.uniform1i(u.uStars, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, auroraTarget.texture);
    gl.uniform1i(u.uAurora, 2);

    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const draw = (frame) => {
    baker.step(frame.bakeTiles);

    starTarget.resize(frame.width, frame.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, starTarget.framebuffer);
    gl.viewport(0, 0, frame.width, frame.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    if (frame.layers.milkyWay) drawDust(frame);
    drawTrails(frame);
    drawMeteors(frame);
    drawStars(frame);
    gl.disable(gl.BLEND);

    if (frame.auroraStrength > 0) {
      drawAurora(frame);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, frame.width, frame.height);
    drawSky(frame);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    baker.dispose();
    starTarget.dispose();
    auroraTarget.dispose();
    [cornerBuffer, brightBuffer, fieldBuffer, dustBuffer, trailStripBuffer, meteorStripBuffer, dynamicBuffer].forEach(
      (buffer) => gl.deleteBuffer(buffer)
    );
    [brightVao, fieldVao, dustVao, trailVao, meteorVao, dynamicVao, emptyVao].forEach((vao) => gl.deleteVertexArray(vao));
    [skyProgram, starProgram, dustProgram, trailProgram, meteorProgram, auroraProgram].forEach(({ program }) =>
      gl.deleteProgram(program)
    );
  };

  const setFieldStars = (stars) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, fieldBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, stars.data, gl.STATIC_DRAW);
    fieldCount = stars.count;
  };

  const setDustStars = (stars) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, stars.data, gl.STATIC_DRAW);
    dustCount = stars.count;
  };

  return {
    draw,
    dispose,
    setFieldStars,
    setDustStars,
    readMilkyWayLuminanceAsync: (size) => baker.readLuminanceAsync(size),
    get bakeDone() {
      return baker.done;
    },
    get dustCount() {
      return dustCount;
    },
  };
};
