#version 300 es
precision highp float;
precision highp int;

// A meteor's luminous wake and lingering train, as a ribbon along its great-circle
// path. The head itself is drawn with the star shader so it blooms like a star.

#include "common.glsl"

layout(location = 0) in vec2 aStrip;

uniform mat3 uHorizontalToView;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform vec3 uExtinction;
uniform float uSigma;
uniform float uTrainSigma;
uniform float uSegments;
uniform vec3 uStart;
uniform vec3 uEnd;
uniform float uHead;
uniform float uWake;
uniform float uBrightness;
uniform float uTrain;
uniform float uHue;

out float vCross;
out vec3 vWakeFlux;
out vec3 vTrainFlux;
flat out float vValid;

const float THRESHOLD = 1.0 / 1500.0;

vec3 slerpDirection(vec3 a, vec3 b, float t) {
  float angle = acos(clamp(dot(a, b), -1.0, 1.0));
  if (angle < 1e-5) return a;
  return (sin((1.0 - t) * angle) * a + sin(t * angle) * b) / sin(angle);
}

void main() {
  float reach = min(uHead, 1.0);
  float segmentStep = 1.0 / uSegments;
  float u = aStrip.x * segmentStep;
  float s = u * reach;
  vec3 here = slerpDirection(uStart, uEnd, s);
  vec3 before = slerpDirection(uStart, uEnd, max(u - segmentStep, 0.0) * reach);
  vec3 after = slerpDirection(uStart, uEnd, min(u + segmentStep, 1.0) * reach);

  bool visibleHere;
  bool visibleBefore;
  bool visibleAfter;
  vec2 pHere = projectView(uHorizontalToView * here, uCenter, uScale, uAlpha, visibleHere);
  vec2 pBefore = projectView(uHorizontalToView * before, uCenter, uScale, uAlpha, visibleBefore);
  vec2 pAfter = projectView(uHorizontalToView * after, uCenter, uScale, uAlpha, visibleAfter);

  // The wake trails the head and dies quickly once the meteor has burned out; the train
  // is the faint glowing path left behind, brightest where the meteor was brightest.
  float behind = reach - s;
  float burning = uHead <= 1.0 ? 1.0 : exp(-(uHead - 1.0) * 8.0);
  float lightCurve = pow(sin(PI * clamp(reach, 0.02, 1.0)), 0.6);
  float wake = exp(-behind / uWake) * burning * lightCurve;
  float train = uTrain * pow(sin(PI * clamp(s, 0.0, 1.0)), 1.5);

  vec3 hot = mix(vec3(1.0, 0.94, 0.84), vec3(0.62, 1.0, 0.82), uHue);
  vec3 cooling = vec3(1.0, 0.62, 0.38);
  vec3 tint = mix(cooling, hot, exp(-behind / (uWake * 0.6)));
  vec3 transmission = exp(-uExtinction * airmass(here.z));
  vWakeFlux = tint * uBrightness * wake * transmission;
  vTrainFlux = vec3(1.0, 0.72, 0.5) * uBrightness * train * transmission;

  float peak = max(max(vWakeFlux.r, vWakeFlux.g), vWakeFlux.b);
  float trainPeak = max(max(vTrainFlux.r, vTrainFlux.g), vTrainFlux.b);
  float wakeWidth = peak > THRESHOLD ? uSigma * sqrt(2.0 * log(peak / THRESHOLD)) : 0.0;
  float trainWidth = trainPeak > THRESHOLD ? uTrainSigma * sqrt(2.0 * log(trainPeak / THRESHOLD)) : 0.0;
  float halfWidth = min(max(wakeWidth, trainWidth) + 0.75, uSigma * 10.0 + uTrainSigma * 4.0);

  vValid = visibleHere && visibleBefore && here.z > -0.02 && max(peak, trainPeak) > THRESHOLD ? 1.0 : 0.0;

  vec2 tangent = pAfter - pBefore;
  tangent = dot(tangent, tangent) > 1e-6 ? normalize(tangent) : vec2(1.0, 0.0);
  vec2 normal = vec2(-tangent.y, tangent.x);
  vec2 position = visibleHere ? pHere + normal * aStrip.y * halfWidth : uCenter;
  gl_Position = vec4(position / uResolution * 2.0 - 1.0, 0.0, 1.0);
  vCross = aStrip.y * halfWidth;
}
