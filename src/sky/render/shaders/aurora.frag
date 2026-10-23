#version 300 es
precision highp float;
precision highp int;

// Aurora curtains, rendered at reduced resolution and added to the sky in the composite.
//
// Each curtain is a vertical sheet of light hanging from ~100 km, following a slowly
// meandering line roughly east–west across the ground. Rather than marching through the
// volume, every view ray is intersected with every sheet: the crossing point gives the
// height (and so the colour: green low, red high, a pink fringe on the lower edge of
// bright parts) and the position along the curtain (fine vertical rays, drifting bright
// patches). Where a fold is seen edge-on the path through the sheet is long and it
// brightens, which is exactly what makes real curtains look ribboned.

#include "common.glsl"

uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform mat3 uViewToHorizontal;
uniform float uTime;
uniform float uStrength;
uniform float uHeading;

out vec4 outColor;

const float EARTH_RADIUS = 6371.0;
const int CURTAINS = 3;

float valueNoise(float x) {
  float i = floor(x);
  float f = x - i;
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

// Northward offset of curtain k at position x along it (km).
float meander(float x, float k, float t) {
  return (valueNoise(x * 0.0026 + t * 0.010 + k * 17.0) - 0.5) * 300.0 +
         (valueNoise(x * 0.0090 - t * 0.024 + k * 5.3) - 0.5) * 80.0 +
         (valueNoise(x * 0.0340 + t * 0.060 + k * 2.9) - 0.5) * 16.0;
}

// Signed distance north of curtain k for a point r km along the ray's ground track.
float offsetFromCurtain(vec2 direction, float r, float line, float k, float t) {
  return direction.y * r - line - meander(direction.x * r, k, t);
}

// Nearest place where the ray's ground track crosses curtain k: march outward until the
// sign flips, then refine the bracket by false position. Returns -1 when there is none.
float findCrossing(vec2 direction, float line, float k, float t) {
  float previousR = 0.0;
  float previousF = offsetFromCurtain(direction, 0.0, line, k, t);

  for (int i = 1; i <= 15; i++) {
    float r = float(i) * 140.0;
    float f = offsetFromCurtain(direction, r, line, k, t);

    if ((f > 0.0) != (previousF > 0.0)) {
      float a = previousR;
      float fa = previousF;
      float b = r;
      float fb = f;
      for (int j = 0; j < 5; j++) {
        float m = b - fb * (b - a) / (fb - fa);
        float fm = offsetFromCurtain(direction, m, line, k, t);
        if ((fm > 0.0) == (fa > 0.0)) {
          a = m;
          fa = fm;
        } else {
          b = m;
          fb = fm;
        }
      }
      return b - fb * (b - a) / (fb - fa);
    }

    previousR = r;
    previousF = f;
  }

  return -1.0;
}

void main() {
  vec2 offset = gl_FragCoord.xy - uCenter;
  vec3 view = unprojectView(offset, uScale, uAlpha);
  vec3 h = uViewToHorizontal * view;
  float pixel = pixelAngle(length(offset), uScale, uAlpha);

  if (h.z < -0.01) {
    outColor = vec4(0.0);
    return;
  }

  // Ground-plane direction of the ray in a frame whose +y points at the auroral oval.
  float c = cos(uHeading);
  float s = sin(uHeading);
  vec2 ground = vec2(c * h.x - s * h.y, s * h.x + c * h.y);
  float groundLength = max(length(ground), 1e-4);
  vec2 direction = ground / groundLength;
  float tanAlt = max(h.z, 0.0) / groundLength;
  float t = uTime;

  vec3 light = vec3(0.0);

  for (int index = 0; index < CURTAINS; index++) {
    float k = float(index);
    float line = mix(60.0, 520.0, k / float(CURTAINS - 1)) + (hash11(k + 7.0) - 0.5) * 100.0;

    float r = findCrossing(direction, line, k, t);
    if (r <= 0.0) continue;

    float x = direction.x * r;
    float height = r * tanAlt + r * r / (2.0 * EARTH_RADIUS);

    // How obliquely the ray meets the sheet: grazing views pass through more light.
    float slope = (meander(x + 2.0, k, t) - meander(x - 2.0, k, t)) / 4.0;
    vec2 tangent = normalize(vec2(1.0, slope));
    float incidence = abs(direction.x * tangent.y - direction.y * tangent.x);
    float path = 1.0 / max(incidence, 0.14);

    float base = 98.0 + 14.0 * valueNoise(x * 0.012 + k * 9.0 + t * 0.04);
    float above = height - base;
    if (above < -6.0 || above > 420.0) continue;

    // Fine rays fade out when they would alias (far curtains, small screens): one pixel
    // spans roughly r·pixel km of curtain, more when the sheet is seen obliquely.
    float rayFrequency = 0.32;
    float footprint = r * pixel * path * rayFrequency;
    float rays = valueNoise(x * rayFrequency + t * 0.55 + k * 11.0);
    rays = mix(0.55, mix(0.25, 1.15, rays * rays), smoothstep(0.7, 0.15, footprint));
    float bands = mix(0.55, 1.2, valueNoise(x * 0.05 - t * 0.12 + k * 3.1));
    float activity = 0.2 + 0.8 * smoothstep(0.12, 0.7, valueNoise(x * 0.0045 + t * 0.018 + k * 7.7));
    float pulse = 0.75 + 0.25 * valueNoise(t * 0.35 + k * 4.0 + x * 0.002);
    float intensity = activity * rays * bands * pulse * (0.55 + 0.45 * hash11(k + 1.0));

    // A bright, sharp lower border fading upward through green into faint red tops.
    float lower = smoothstep(-4.0, 1.5, above);
    float edge = exp(-0.5 * above * above / 20.0) * 1.6;
    float green = lower * (exp(-max(above, 0.0) / 26.0) + edge);
    float red = smoothstep(50.0, 110.0, above) * exp(-max(above - 110.0, 0.0) / 70.0) * 0.18;
    float fringe = exp(-0.5 * (above + 1.5) * (above + 1.5) / 6.0) * 0.6 * activity * activity;

    light += intensity * path * (
      green * vec3(0.05, 1.0, 0.36) +
      red * vec3(0.95, 0.1, 0.36) +
      fringe * vec3(0.9, 0.2, 0.8)
    );
  }

  // Slow breathing of the whole display.
  float display = 0.65 + 0.35 * valueNoise(t * 0.03 + 3.7);
  outColor = vec4(light * uStrength * display * 0.06, 1.0);
}
