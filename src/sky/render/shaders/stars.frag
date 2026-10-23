#version 300 es
precision highp float;

// Star profile: a pin-sharp Gaussian core, a slightly wider skirt and a soft glow, the
// way a camera lens with a light diffusion filter renders a bright point. The output is
// already tone mapped (1 − e^−I) and blended with ONE, ONE_MINUS_SRC_COLOR into an sRGB
// target. Because 1 − (1 − a)(1 − b) = 1 − e^−(x + y), overlapping stars combine exactly
// as if their light had been summed before the tone curve.

uniform float uSigma;
uniform float uSkirtSigma;
uniform float uGlowSigma;

in vec2 vOffset;
in vec3 vFlux;
in vec2 vHalo;

out vec4 outColor;

void main() {
  float d2 = dot(vOffset, vOffset);
  float core = exp(-0.5 * d2 / (uSigma * uSigma));
  float skirt = vHalo.x * exp(-0.5 * d2 / (uSkirtSigma * uSkirtSigma));
  float glow = vHalo.y * exp(-0.5 * d2 / (uGlowSigma * uGlowSigma));
  vec3 light = vFlux * (core + skirt + glow);
  outColor = vec4(1.0 - exp(-light), 1.0);
}
