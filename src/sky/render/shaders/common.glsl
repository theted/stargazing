// Shared GLSL helpers: integer hashing, gradient noise, fBm, air mass, tone curve.

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// PCG-style hashes (Jarzynski & Olano, "Hash Functions for GPU Rendering", 2020).
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

uvec2 pcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v;
}

vec3 hash33(vec3 p) {
  return vec3(pcg3d(uvec3(ivec3(p) + 65536))) * (1.0 / 4294967295.0);
}

vec2 hash22(vec2 p) {
  return vec2(pcg2d(uvec2(ivec2(p) + 65536))) * (1.0 / 4294967295.0);
}

float hash11(float p) {
  return float(pcg2d(uvec2(uint(int(p) + 65536), 7919u)).x) * (1.0 / 4294967295.0);
}

vec3 gradient3(vec3 lattice) {
  return normalize(hash33(lattice) * 2.0 - 1.0 + 1e-4);
}

// 3D gradient noise in roughly [-1, 1].
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float n000 = dot(gradient3(i), f);
  float n100 = dot(gradient3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
  float n010 = dot(gradient3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
  float n110 = dot(gradient3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
  float n001 = dot(gradient3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
  float n101 = dot(gradient3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
  float n011 = dot(gradient3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
  float n111 = dot(gradient3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));

  return 1.6 * mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

// 2D gradient noise in roughly [-1, 1].
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  vec2 g00 = normalize(hash22(i) * 2.0 - 1.0 + 1e-4);
  vec2 g10 = normalize(hash22(i + vec2(1, 0)) * 2.0 - 1.0 + 1e-4);
  vec2 g01 = normalize(hash22(i + vec2(0, 1)) * 2.0 - 1.0 + 1e-4);
  vec2 g11 = normalize(hash22(i + vec2(1, 1)) * 2.0 - 1.0 + 1e-4);

  return 1.4 * mix(
    mix(dot(g00, f), dot(g10, f - vec2(1, 0)), u.x),
    mix(dot(g01, f - vec2(0, 1)), dot(g11, f - vec2(1, 1)), u.x),
    u.y
  );
}

// Rotations between octaves break up lattice alignment.
const mat3 OCTAVE3 = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64) * 2.03;
const mat2 OCTAVE2 = mat2(1.6, 1.2, -1.2, 1.6);

float fbm3(vec3 p, int octaves, float gain) {
  float sum = 0.0;
  float amplitude = 0.5;
  float norm = 0.0;
  for (int octave = 0; octave < 10; octave++) {
    if (octave >= octaves) break;
    sum += amplitude * noise3(p);
    norm += amplitude;
    amplitude *= gain;
    p = OCTAVE3 * p;
  }
  return sum / norm;
}

float fbm2(vec2 p, int octaves, float gain) {
  float sum = 0.0;
  float amplitude = 0.5;
  float norm = 0.0;
  for (int octave = 0; octave < 10; octave++) {
    if (octave >= octaves) break;
    sum += amplitude * noise2(p);
    norm += amplitude;
    amplitude *= gain;
    p = OCTAVE2 * p;
  }
  return sum / norm;
}

// Relative air mass (Kasten & Young) from the sine of the altitude.
float airmass(float sinAlt) {
  float s = max(sinAlt, 0.0);
  float degreesAlt = degrees(asin(s));
  return 1.0 / (s + 0.50572 * pow(degreesAlt + 6.07995, -1.6364));
}

// Azimuthal projection r = scale · tan(αθ) / 2α (see projection.js). Returns the
// screen position, or a far-away point when the direction cannot be shown.
vec2 projectView(vec3 view, vec2 centre, float scale, float alpha, out bool visible) {
  float sinTheta = length(view.xy);
  float theta = atan(sinTheta, view.z);
  visible = theta * alpha < 1.5;
  if (!visible) return vec2(1e6);
  float radius = scale * tan(alpha * theta) / (2.0 * alpha);
  return centre + (sinTheta > 1e-7 ? view.xy * (radius / sinTheta) : vec2(0.0));
}

vec3 unprojectView(vec2 offset, float scale, float alpha) {
  float radius = length(offset);
  float theta = atan(2.0 * alpha * radius / scale) / alpha;
  return radius > 1e-6 ? vec3(offset / radius * sin(theta), cos(theta)) : vec3(0.0, 0.0, 1.0);
}

// Angular size of one pixel at a given distance from the centre.
float pixelAngle(float radius, float scale, float alpha) {
  float k = 2.0 * alpha * radius / scale;
  return 2.0 / (scale * (1.0 + k * k));
}

vec3 toneMap(vec3 linear) {
  return 1.0 - exp(-linear);
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
