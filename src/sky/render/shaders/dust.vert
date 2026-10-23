#version 300 es
precision highp float;
precision highp int;

// Faint "dust" stars as GL points: no twinkle, no glow, just a sharp PSF. They are far
// too numerous for the full star shader and only need to sparkle quietly in the band.

#include "common.glsl"

layout(location = 0) in vec3 aDirection;
layout(location = 1) in vec2 aPacked;

uniform mat3 uEquatorialToView;
uniform vec3 uZenith;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform float uReferenceMagnitude;
uniform vec3 uExtinction;
uniform float uSigma;
uniform float uDust;
uniform samplerCube uMilkyWay;

out vec3 vFlux;
out float vSize;

const float THRESHOLD = 1.0 / 1500.0;

vec3 colorFromIndex(float bv) {
  vec3 blue = vec3(0.86, 0.93, 1.1);
  vec3 white = vec3(1.0, 0.98, 0.95);
  vec3 orange = vec3(1.12, 0.96, 0.8);
  return bv < 0.55 ? mix(blue, white, smoothstep(-0.3, 0.55, bv)) : mix(white, orange, smoothstep(0.55, 1.6, bv));
}

void main() {
  vec3 direction = normalize(aDirection);
  vec3 view = uEquatorialToView * direction;
  float sinAlt = dot(direction, uZenith);
  bool visible;
  vec2 centre = projectView(view, uCenter, uScale, uAlpha, visible);

  float magnitude = 7.0 + aPacked.x * 255.0 / 40.0;
  vec3 flux = colorFromIndex(aPacked.y * 255.0 / 90.0 - 0.4) * exp2(-1.32877 * (magnitude - uReferenceMagnitude));
  flux *= exp(-uExtinction * airmass(sinAlt));
  flux *= mix(1.0, textureLod(uMilkyWay, direction, 1.0).a, uDust);
  float peak = max(flux.r, max(flux.g, flux.b));

  if (!visible || sinAlt < -0.03 || peak < THRESHOLD) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vFlux = vec3(0.0);
    vSize = 1.0;
    return;
  }

  float radius = max(uSigma * sqrt(2.0 * log(peak / THRESHOLD)), 1.0) + 0.5;
  vSize = 2.0 * radius;
  gl_PointSize = vSize;
  gl_Position = vec4(centre / uResolution * 2.0 - 1.0, 0.0, 1.0);
  vFlux = flux;
}
