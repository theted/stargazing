#version 300 es
precision highp float;

uniform float uSigma;
uniform float uTrainSigma;

in float vCross;
in vec3 vWakeFlux;
in vec3 vTrainFlux;
flat in float vValid;

out vec4 outColor;

void main() {
  if (vValid < 0.5) discard;
  float wake = exp(-0.5 * vCross * vCross / (uSigma * uSigma));
  float train = exp(-0.5 * vCross * vCross / (uTrainSigma * uTrainSigma));
  outColor = vec4(1.0 - exp(-(vWakeFlux * wake + vTrainFlux * train)), 1.0);
}
