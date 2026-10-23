#version 300 es
precision highp float;

uniform float uSigma;

in float vCross;
in vec3 vFlux;
flat in float vValid;

out vec4 outColor;

void main() {
  if (vValid < 0.5) discard;
  float core = exp(-0.5 * vCross * vCross / (uSigma * uSigma));
  outColor = vec4(1.0 - exp(-vFlux * core), 1.0);
}
