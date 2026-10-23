#version 300 es
precision highp float;
precision highp int;

// Long-exposure star trails, drawn analytically: each catalogue star becomes a ribbon
// along its circle around the celestial pole, from where it is now back to where it was
// when the "shutter" opened. No accumulation buffer, so trails stay crisp while the
// camera moves.

#include "common.glsl"

layout(location = 0) in vec2 aStrip;
layout(location = 1) in vec3 aDirection;
layout(location = 2) in float aMagnitude;
layout(location = 3) in vec3 aColor;

uniform mat3 uEquatorialToView;
uniform vec3 uZenith;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform float uReferenceMagnitude;
uniform vec3 uExtinction;
uniform float uSigma;
uniform float uSegments;
uniform float uTrailAngle;
uniform float uTrailGain;
uniform float uTrailFade;
uniform float uMaxSpan;

out float vCross;
out vec3 vFlux;
flat out float vValid;

const float THRESHOLD = 1.0 / 1500.0;

vec3 rotateAboutPole(vec3 direction, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * direction.x - s * direction.y, s * direction.x + c * direction.y, direction.z);
}

void main() {
  float segmentStep = 1.0 / uSegments;
  float u = aStrip.x * segmentStep;
  vec3 here = rotateAboutPole(aDirection, uTrailAngle * u);
  vec3 headward = rotateAboutPole(aDirection, uTrailAngle * max(u - segmentStep, 0.0));
  vec3 tailward = rotateAboutPole(aDirection, uTrailAngle * min(u + segmentStep, 1.0));

  bool visibleHere;
  bool visibleHeadward;
  bool visibleTailward;
  vec2 pHere = projectView(uEquatorialToView * here, uCenter, uScale, uAlpha, visibleHere);
  vec2 pHeadward = projectView(uEquatorialToView * headward, uCenter, uScale, uAlpha, visibleHeadward);
  vec2 pTailward = projectView(uEquatorialToView * tailward, uCenter, uScale, uAlpha, visibleTailward);

  float sinAlt = dot(here, uZenith);
  // Brightest at the star, fading toward the moment the exposure began.
  float profile = mix(1.0, 1.0 - u, uTrailFade) * smoothstep(1.0, 0.94, u);
  vec3 flux = aColor * exp2(-1.32877 * (aMagnitude - uReferenceMagnitude)) * uTrailGain * profile;
  flux *= exp(-uExtinction * airmass(sinAlt));
  float peak = max(flux.r, max(flux.g, flux.b));

  // Triangles take this flag from their last vertex, which always sits at the tail end of
  // the segment being drawn, so a segment is kept or dropped as a whole.
  bool segmentOk = visibleHere && visibleHeadward && distance(pHere, pHeadward) < uMaxSpan && sinAlt > -0.05;
  vValid = segmentOk && peak > THRESHOLD ? 1.0 : 0.0;

  vec2 tangent = pTailward - pHeadward;
  tangent = dot(tangent, tangent) > 1e-6 ? normalize(tangent) : vec2(1.0, 0.0);
  vec2 normal = vec2(-tangent.y, tangent.x);
  float halfWidth = uSigma * sqrt(2.0 * log(max(peak / THRESHOLD, 1.0))) + 0.75;
  halfWidth = min(halfWidth, uSigma * 6.0);

  vec2 position = visibleHere ? pHere + normal * aStrip.y * halfWidth : uCenter;
  gl_Position = vec4(position / uResolution * 2.0 - 1.0, 0.0, 1.0);
  vCross = aStrip.y * halfWidth;
  vFlux = flux;
}
