#version 300 es
precision highp float;
precision highp int;

// Bakes one cube-map face of the Milky Way in the equatorial frame. Runs once at start-up
// (in tiles, spread across frames), so it can afford a lot of noise.
//
// Output: rgb = diffuse galactic light × 0.5 (sRGB-encoded storage; the brightest star
// clouds reach about 1), a = dust transmission, used to hide faint field stars that sit
// behind dark lanes.

#include "common.glsl"

uniform int uFace;
uniform float uSize;
uniform mat3 uEquatorialToGalactic;
uniform highp sampler2D uFeatures;
uniform int uFeatureCount;

out vec4 outColor;

vec3 faceDirection(int face, vec2 st) {
  float sc = st.x * 2.0 - 1.0;
  float tc = st.y * 2.0 - 1.0;
  if (face == 0) return vec3(1.0, -tc, -sc);
  if (face == 1) return vec3(-1.0, -tc, sc);
  if (face == 2) return vec3(sc, 1.0, tc);
  if (face == 3) return vec3(sc, -1.0, -tc);
  if (face == 4) return vec3(sc, -tc, 1.0);
  return vec3(-sc, -tc, -1.0);
}

float gaussian(float x, float sigma) {
  return exp(-0.5 * x * x / (sigma * sigma));
}

// Sparse bright specks: unresolved knots of stars at sub-degree scales.
float starGrain(vec3 p) {
  float sum = 0.0;
  float amplitude = 1.0;
  for (int octave = 0; octave < 3; octave++) {
    float n = noise3(p) * 0.5 + 0.5;
    sum += amplitude * n * n * n * n;
    amplitude *= 0.6;
    p = OCTAVE3 * p;
  }
  return sum;
}

void main() {
  vec3 eq = normalize(faceDirection(uFace, gl_FragCoord.xy / uSize));
  vec3 g = uEquatorialToGalactic * eq;
  float l = degrees(atan(g.y, g.x));
  float b = degrees(asin(clamp(g.z, -1.0, 1.0)));
  float absB = abs(b);

  // Domain warp gives clouds and lanes their drifting shapes. Galactic z is stretched so
  // structure elongates along the plane.
  vec3 p = g * vec3(1.0, 1.0, 1.8);
  vec3 warp = vec3(
    fbm3(p * 2.6 + vec3(1.7, 9.2, 3.3), 5, 0.5),
    fbm3(p * 2.6 + vec3(8.3, 2.8, 5.1), 5, 0.5),
    fbm3(p * 2.6 + vec3(4.4, 6.6, 7.7), 5, 0.5)
  );
  vec3 q = p + warp * 0.06;

  // ── Starlight ─────────────────────────────────────────────────────────────
  float inner = exp(-pow(l / 46.0, 2.0));
  float lonProfile =
    0.07 + 0.36 * inner + 0.16 * gaussian(l - 74.0, 18.0) + 0.1 * gaussian(l + 52.0, 26.0) + 0.05 * gaussian(l - 30.0, 14.0);
  float scaleHeight = mix(2.6, 5.0, inner);
  float disk = lonProfile * exp(-absB / scaleHeight);
  float thick = 0.05 * exp(-absB / 11.0) * (0.35 + 0.65 * inner);
  float bulge = 0.62 * exp(-0.5 * (pow(l / 9.5, 2.0) + pow((b + 2.0) / 6.8, 2.0)));
  float halo = 0.004 * (0.5 + 0.5 * inner);

  float clouds = fbm3(q * vec3(5.0, 5.0, 8.0), 6, 0.5) * 0.5 + 0.5;
  float knots = fbm3(q * 22.0 + 3.1, 4, 0.5) * 0.5 + 0.5;
  float grain = starGrain(q * 420.0);
  float cloudShape = smoothstep(0.3, 0.75, clouds);
  float structure = mix(0.3, 1.55, cloudShape) * mix(0.7, 1.35, knots) * mix(0.6, 1.5, grain);

  float light = (disk + bulge) * structure + thick * mix(0.7, 1.3, clouds) + halo;

  float warmth = smoothstep(0.05, 0.7, inner * exp(-absB / 10.0)) + bulge;
  vec3 color = mix(vec3(0.86, 0.91, 1.0), vec3(1.0, 0.88, 0.72), clamp(warmth, 0.0, 1.0));
  vec3 emission = color * light;

  // ── Dust ─────────────────────────────────────────────────────────────────
  float lanes = fbm3(q * vec3(4.2, 4.2, 9.0) + 19.3, 6, 0.55) * 0.5 + 0.5;
  float detail = fbm3(q * vec3(14.0, 14.0, 28.0) + 7.7, 5, 0.6) * 0.5 + 0.5;
  float filament = pow(1.0 - abs(fbm3(q * vec3(10.0, 10.0, 22.0) + 41.0, 5, 0.55)), 8.0);

  float riftCentre = 1.2 + 0.03 * clamp(l, -10.0, 80.0);
  float rift = smoothstep(-14.0, -2.0, l) * smoothstep(86.0, 70.0, l) * gaussian(b - riftCentre, 2.4);
  float plane = gaussian(b + 0.3, mix(1.2, 2.2, inner)) * (0.3 + 0.7 * inner);
  float envelope = max(plane, rift * 1.3) + 0.12 * exp(-absB / 8.0);
  float patches = smoothstep(0.38, 0.72, lanes) * mix(0.6, 1.25, detail);
  float tau = envelope * (2.0 * patches + 0.9 * filament);

  // ── Named features ───────────────────────────────────────────────────────
  vec3 glow = vec3(0.0);
  for (int index = 0; index < 96; index++) {
    if (index >= uFeatureCount) break;
    vec4 head = texelFetch(uFeatures, ivec2(0, index), 0);
    vec4 axis1 = texelFetch(uFeatures, ivec2(1, index), 0);
    vec4 axis2 = texelFetch(uFeatures, ivec2(2, index), 0);
    vec4 tint = texelFetch(uFeatures, ivec2(3, index), 0);
    int kind = int(head.w + 0.5);
    float reach = kind == 2 ? axis1.w + axis2.w * 4.0 : max(axis1.w, axis2.w) * 4.0;
    if (dot(eq, head.xyz) < cos(min(reach, 3.0))) continue;

    float x = dot(eq, axis1.xyz);
    float y = dot(eq, axis2.xyz);

    if (kind == 2) {
      float wobble = mix(0.2, 1.6, smoothstep(0.3, 0.8, knots));
      glow += 0.3 * tint.rgb * tint.a * gaussian(sqrt(x * x + y * y) - axis1.w, axis2.w) * wobble;
    } else {
      float shape = exp(-0.5 * (x * x / (axis1.w * axis1.w) + y * y / (axis2.w * axis2.w)));
      if (kind == 1) {
        tau += tint.a * shape * mix(0.6, 1.3, lanes);
      } else if (kind == 3) {
        // Galaxies: clumpy star clouds with a grainy texture.
        glow += tint.rgb * tint.a * shape * mix(0.35, 1.5, knots) * mix(0.6, 1.4, grain);
      } else {
        glow += 0.3 * tint.rgb * tint.a * shape * mix(0.6, 1.3, cloudShape);
      }
    }
  }

  // Blue is extinguished most, so lane edges redden like real dust.
  vec3 transmission = exp(-tau * vec3(0.88, 1.0, 1.16));
  vec3 light3 = emission * transmission + glow * mix(transmission, vec3(1.0), 0.5);

  outColor = vec4(light3 * 0.5, exp(-tau * 0.9));
}
