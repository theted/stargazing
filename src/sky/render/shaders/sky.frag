#version 300 es
precision highp float;
precision highp int;

// Final composite, one pass per frame: sky glow, the baked Milky Way, the star buffer,
// aurora, the landscape silhouette, vignette and dithered sRGB output.

#include "common.glsl"

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAlpha;
uniform mat3 uViewToHorizontal;
uniform mat3 uHorizontalToEquatorial;
uniform float uTime;
uniform float uExposure;
uniform float uFade;

uniform samplerCube uMilkyWay;
uniform float uMilkyWayGain;
uniform float uTrailAngle;
uniform sampler2D uStars;
uniform sampler2D uAurora;
uniform float uAuroraOn;

uniform vec3 uExtinction;
uniform float uAtmosphereOn;
uniform float uSkyGlow;
uniform vec2 uAirglow;
uniform vec4 uDome[3];
uniform vec3 uDomeColor[3];

uniform float uLandscapeOn;
uniform float uLandscapeTop;
uniform vec4 uRidge[3];
uniform vec4 uRidgeColor[3];
uniform vec3 uRidgeSeed;
uniform vec4 uCone[2];
uniform vec4 uTrees;
uniform float uTreeWidth;
uniform vec3 uTreeColor;
uniform vec3 uGroundLight;

uniform float uVignette;
uniform int uDebug;
uniform mat3 uGalacticToEquatorial;

out vec4 outColor;

float wrapAngle(float angle) {
  return angle - TAU * floor((angle + PI) / TAU);
}

// ── Atmosphere ──────────────────────────────────────────────────────────────

// Brightening of a thin emitting shell toward the horizon (van Rhijn).
float vanRhijn(float sinAlt, float ratio) {
  float s = max(sinAlt, 0.0);
  return inversesqrt(max(1.0 - ratio * ratio * (1.0 - s * s), 1e-3));
}

// Where a view ray pierces a shell `height` km up, as an east/north offset in km.
vec2 shellPoint(vec3 h, float height) {
  const float R = 6371.0;
  float s = max(h.z, 0.0);
  float distance = sqrt(R * R * s * s + 2.0 * R * height + height * height) - R * s;
  return h.xy * distance;
}

vec3 airglow(vec3 h, vec3 transmission) {
  vec2 green = shellPoint(h, 95.0);
  vec2 red = shellPoint(h, 250.0);

  // Slow gravity-wave ripples and patchy cells drifting across the emitting layers.
  float waves = 0.5 + 0.5 * sin(dot(green, vec2(0.05, 0.03)) + uTime * 0.04 + 2.5 * noise2(green * 0.004 + uTime * 0.002));
  float cells = fbm2(green * 0.0042 + vec2(uTime * 0.003, 0.0), 4, 0.5) * 0.5 + 0.5;
  float greenStructure = mix(0.45, 1.45, cells) * mix(0.8, 1.2, waves);
  float redPatches = smoothstep(0.45, 0.85, fbm2(red * 0.0014 + 7.3, 4, 0.55) * 0.5 + 0.5);

  // Thin shells brighten steeply toward the horizon; squaring the van Rhijn factor keeps
  // the zenith clean and gathers the glow into a band a few degrees up.
  float greenRise = pow(vanRhijn(h.z, 0.9723), 2.0) / 36.0;
  float redRise = pow(vanRhijn(h.z, 0.9622), 2.0) / 13.5;
  vec3 greenGlow = vec3(0.07, 0.36, 0.25) * greenRise * greenStructure;
  vec3 redGlow = vec3(0.42, 0.07, 0.12) * redRise * redPatches * uAirglow.y;
  return (greenGlow + redGlow) * uAirglow.x * 0.042 * sqrt(transmission);
}

vec3 lightDomes(float azimuth, float sinAlt) {
  vec3 sum = vec3(0.0);
  float elevation = max(asin(clamp(sinAlt, -1.0, 1.0)), 0.0);
  for (int i = 0; i < 3; i++) {
    vec4 dome = uDome[i];
    if (dome.z <= 0.0) continue;
    float spread = wrapAngle(azimuth - dome.x) / dome.y;
    float falloff = exp(-spread * spread) * exp(-elevation / (0.12 + 0.05 * exp(-spread * spread)));
    sum += uDomeColor[i] * dome.z * falloff;
  }
  return sum * 0.02;
}

// Natural sky background: integrated starlight, zodiacal and scattered light. Deep blue
// overhead, lifting and turning slate-teal toward the horizon.
vec3 skyBackground(float sinAlt) {
  float lift = pow(1.0 - clamp(sinAlt, 0.0, 1.0), 3.0);
  vec3 zenith = vec3(0.0022, 0.0029, 0.0058);
  vec3 horizon = vec3(0.0056, 0.0085, 0.0115);
  return mix(zenith, horizon, lift) * uSkyGlow;
}

// ── Landscape ───────────────────────────────────────────────────────────────

float ridgeAltitude(int layer, float azimuth) {
  vec4 ridge = uRidge[layer];
  float seed = layer == 0 ? uRidgeSeed.x : layer == 1 ? uRidgeSeed.y : uRidgeSeed.z;
  vec2 circle = vec2(cos(azimuth), sin(azimuth)) * ridge.z + seed * 3.71;
  float n = fbm2(circle, 8, ridge.w) * 0.5 + 0.5;
  float height = ridge.x + ridge.y * n * n * 1.4;

  for (int i = 0; i < 2; i++) {
    vec4 cone = uCone[i];
    if (int(cone.w + 0.5) != layer || cone.y <= 0.0) continue;
    float distance = abs(wrapAngle(azimuth - cone.x)) / cone.z;
    float profile = pow(max(1.0 - distance, 0.0), 1.25);
    float summit = min(profile, 0.93) + 0.05 * n * profile;
    height = max(height, ridge.x + cone.y * summit);
  }

  return height;
}

float treeCoverage(float azimuth, float altitude, float ground, float pixel) {
  float cells = max(floor(uTrees.y * TAU), 1.0);
  float cellWidth = TAU / cells;
  float index = floor((azimuth + PI) / cellWidth);
  float coverage = 0.0;

  for (int k = -2; k <= 2; k++) {
    float cell = mod(index + float(k), cells);
    vec2 h = hash22(vec2(cell, 91.0));
    if (h.y < 0.1) continue;
    float centre = (cell + 0.15 + 0.7 * h.x) * cellWidth - PI;
    float height = uTrees.z * (1.0 - uTrees.w * fract(h.x * 17.3 + h.y * 5.9));
    float y = (altitude - ground + height * 0.06) / height;
    if (y < 0.0 || y > 1.0) continue;
    float tiers = 6.0 + floor(h.y * 5.0);
    float tier = fract(y * tiers + h.x);
    float halfWidth = height * uTreeWidth * pow(1.0 - y, 1.08) * (0.55 + 0.45 * tier);
    halfWidth = max(halfWidth, pixel * 0.35);
    float dx = abs(wrapAngle(azimuth - centre)) * cos(altitude);
    coverage = max(coverage, clamp((halfWidth - dx) / pixel + 0.5, 0.0, 1.0));
  }

  return coverage;
}

// Returns (colour, coverage) for the nearest landscape layer in front of the sky.
vec4 landscape(float azimuth, float altitude, float pixel, vec3 mistColor) {
  vec4 result = vec4(0.0);

  for (int layer = 0; layer < 3; layer++) {
    float ground = ridgeAltitude(layer, azimuth);
    float coverage = clamp((ground - altitude) / pixel + 0.5, 0.0, 1.0);
    float trees = 0.0;

    if (uTrees.x > -0.5 && int(uTrees.x + 0.5) == layer && altitude > ground - 4.0 * pixel) {
      trees = treeCoverage(azimuth, altitude, ground, pixel);
    }

    float cover = max(coverage, trees);
    if (cover <= 0.0) continue;

    vec4 tint = uRidgeColor[layer];
    float depth = clamp((ground - altitude) / max(uRidge[layer].y * 0.9, 0.01), 0.0, 1.0);
    vec3 color = mix(tint.rgb, tint.rgb + mistColor, tint.a * smoothstep(0.0, 1.0, depth));

    // The nearest ground catches a little sky light (snow under an aurora glows).
    if (layer == 2) {
      color += uGroundLight * smoothstep(0.0, 0.3, ground - altitude);
    }

    color = mix(color, uTreeColor, trees);
    result = vec4(mix(result.rgb, color, cover), max(result.a, cover));
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────────────────

void main() {
  // Debug views: 1 = all-sky galactic map of the baked Milky Way, 2 = star buffer only.
  if (uDebug == 1) {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float l = (0.5 - uv.x) * TAU;
    float b = (uv.y - 0.5) * PI;
    vec3 galactic = vec3(cos(b) * cos(l), cos(b) * sin(l), sin(b));
    vec4 baked = texture(uMilkyWay, uGalacticToEquatorial * galactic);
    vec3 shown = uv.y < 0.0 ? vec3(baked.a) : toneMap(baked.rgb * 2.0 * uExposure);
    outColor = vec4(linearToSrgb(shown), 1.0);
    return;
  }
  if (uDebug == 2) {
    outColor = vec4(linearToSrgb(texture(uStars, gl_FragCoord.xy / uResolution).rgb), 1.0);
    return;
  }
  if (uDebug == 3) {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float l = (0.5 - uv.x) * TAU;
    float b = (uv.y - 0.5) * PI;
    vec3 galactic = vec3(cos(b) * cos(l), cos(b) * sin(l), sin(b));
    outColor = vec4(vec3(texture(uMilkyWay, uGalacticToEquatorial * galactic).a), 1.0);
    return;
  }

  vec2 offset = gl_FragCoord.xy - uCenter;
  vec3 view = unprojectView(offset, uScale, uAlpha);
  vec3 h = uViewToHorizontal * view;
  float sinAlt = h.z;
  float altitude = asin(clamp(sinAlt, -1.0, 1.0));
  float azimuth = atan(h.x, h.y);
  float pixel = pixelAngle(length(offset), uScale, uAlpha);

  vec3 transmission = uAtmosphereOn > 0.5 ? exp(-uExtinction * airmass(sinAlt)) : vec3(1.0);

  // Celestial light: the baked Milky Way, smeared along star trails in long exposures.
  vec3 equatorial = uHorizontalToEquatorial * h;
  vec3 galaxy = vec3(0.0);
  if (uMilkyWayGain > 0.0) {
    if (uTrailAngle > 0.0) {
      for (int i = 0; i < 12; i++) {
        float angle = -uTrailAngle * (float(i) + 0.5) / 12.0;
        float c = cos(angle);
        float s = sin(angle);
        vec3 rotated = vec3(c * equatorial.x - s * equatorial.y, s * equatorial.x + c * equatorial.y, equatorial.z);
        galaxy += texture(uMilkyWay, rotated).rgb;
      }
      galaxy *= 2.0 / 12.0;
    } else {
      galaxy = texture(uMilkyWay, equatorial).rgb * 2.0;
    }
    galaxy *= uMilkyWayGain;
  }

  vec3 sky = galaxy * transmission;
  vec3 domes = vec3(0.0);
  if (uAtmosphereOn > 0.5) {
    domes = lightDomes(azimuth, sinAlt);
    sky += airglow(h, transmission) + domes + skyBackground(sinAlt);
  } else {
    sky += vec3(0.0012, 0.0015, 0.0024);
  }

  if (uAuroraOn > 0.5) {
    sky += texture(uAurora, gl_FragCoord.xy / uResolution).rgb * sqrt(transmission);
  }

  vec3 color = toneMap(sky * uExposure);
  vec3 stars = texture(uStars, gl_FragCoord.xy / uResolution).rgb;
  color = 1.0 - (1.0 - color) * (1.0 - stars);

  // The ground: layered silhouettes with valley mist lit by the horizon glow.
  if (uLandscapeOn > 0.5) {
    if (altitude < uLandscapeTop) {
      vec3 mist = toneMap((lightDomes(azimuth, 0.02) * 0.5 + skyBackground(0.05) * 0.6) * uExposure);
      vec4 land = landscape(azimuth, altitude, pixel, mist);
      color = mix(color, land.rgb * uFade, land.a);
    }
  } else {
    float ground = smoothstep(pixel, -pixel, altitude);
    color = mix(color, vec3(0.0018, 0.002, 0.0028) * uFade, ground);
  }

  // Gentle lens vignette.
  vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
  float aspect = uResolution.x / uResolution.y;
  float vignette = 1.0 - uVignette * smoothstep(0.25, 0.95, length(uv * vec2(aspect, 1.0)) / sqrt(aspect * aspect + 1.0) * 2.0);
  color *= vignette;

  // Triangular dither hides banding in the long dark gradients.
  vec2 noise = hash22(gl_FragCoord.xy + fract(uTime * 7.13) * 512.0);
  vec3 srgb = linearToSrgb(color) + (noise.x + noise.y - 1.0) / 255.0;
  outColor = vec4(srgb, 1.0);
}
