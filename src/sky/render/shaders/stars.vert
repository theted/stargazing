#version 300 es
precision highp float;
precision highp int;

// One instanced quad per star. The quad is sized to the radius where the star's light
// drops below visibility, so faint stars cost a few pixels and bright ones get room for
// their glow.

#include "common.glsl"

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aDirection;
layout(location = 2) in float aMagnitude;
layout(location = 3) in vec3 aColor;
layout(location = 4) in float aSeed;

uniform mat3 uEquatorialToView;
uniform vec3 uZenith;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform float uReferenceMagnitude;
uniform vec3 uExtinction;
uniform float uSigma;
uniform float uSkirtSigma;
uniform float uGlowSigma;
uniform vec2 uHaloRatio;
uniform vec2 uHaloKnee;
uniform float uMaxRadius;
uniform float uTime;
uniform float uTwinkle;
uniform float uDust;
uniform samplerCube uMilkyWay;

out vec2 vOffset;
out vec3 vFlux;
out vec2 vHalo;

const float THRESHOLD = 1.0 / 1500.0;

float smoothNoise(float x) {
  float i = floor(x);
  float f = x - i;
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void cull() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vFlux = vec3(0.0);
  vHalo = vec2(0.0);
  vOffset = vec2(0.0);
}

void main() {
  vec3 view = uEquatorialToView * aDirection;
  float sinAlt = dot(aDirection, uZenith);
  bool visible;
  vec2 centre = projectView(view, uCenter, uScale, uAlpha, visible);

  if (!visible || sinAlt < -0.03) {
    cull();
    return;
  }

  vec3 flux = aColor * exp2(-1.32877 * (aMagnitude - uReferenceMagnitude));
  flux *= exp(-uExtinction * airmass(sinAlt));

  if (uDust > 0.0) {
    flux *= mix(1.0, textureLod(uMilkyWay, aDirection, 1.0).a, uDust);
  }

  // Scintillation: barely there overhead, lively near the horizon, where bright stars
  // also flash colour as each wavelength takes a slightly different path.
  float low = 1.0 - clamp(sinAlt, 0.0, 1.0);
  float amplitude = uTwinkle * (0.04 + 0.5 * low * low * low);
  float rate = 1.2 + 3.5 * aSeed;
  float phase = aSeed * 1031.0;
  float n = smoothNoise(uTime * rate + phase) * 0.7 + smoothNoise(uTime * rate * 2.7 + phase * 1.7) * 0.3;
  vec3 chroma = vec3(
    smoothNoise(uTime * rate * 1.9 + phase + 11.0),
    smoothNoise(uTime * rate * 2.1 + phase + 23.0),
    smoothNoise(uTime * rate * 2.3 + phase + 37.0)
  ) - 0.5;
  flux *= max(1.0 + amplitude * (2.0 * n - 1.0) + chroma * amplitude * low * 1.2, 0.0);

  float peak = max(flux.r, max(flux.g, flux.b));
  if (peak < THRESHOLD) {
    cull();
    return;
  }

  // Skirt and glow each carry a fixed share of a bright star's light but fade out below
  // their knee, so only bright stars bloom while faint ones stay crisp points.
  vec2 knee = peak * peak / (peak * peak + uHaloKnee * uHaloKnee);
  vec2 halo = uHaloRatio * knee;
  float coreRadius = uSigma * sqrt(2.0 * log(peak / THRESHOLD));
  float skirtPeak = peak * halo.x;
  float glowPeak = peak * halo.y;
  float skirtRadius = skirtPeak > THRESHOLD ? uSkirtSigma * sqrt(2.0 * log(skirtPeak / THRESHOLD)) : 0.0;
  float glowRadius = glowPeak > THRESHOLD ? uGlowSigma * sqrt(2.0 * log(glowPeak / THRESHOLD)) : 0.0;
  float radius = min(max(max(coreRadius, max(skirtRadius, glowRadius)), 2.0 * uSigma) + 1.0, uMaxRadius);

  vec2 offset = aCorner * radius;
  gl_Position = vec4((centre + offset) / uResolution * 2.0 - 1.0, 0.0, 1.0);
  vOffset = offset;
  vFlux = flux;
  vHalo = halo;
}
