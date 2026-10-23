#version 300 es
precision highp float;

uniform float uSigma;

in vec3 vFlux;
in float vSize;

out vec4 outColor;

void main() {
  vec2 offset = (gl_PointCoord - 0.5) * vSize;
  float core = exp(-0.5 * dot(offset, offset) / (uSigma * uSigma));
  outColor = vec4(1.0 - exp(-vFlux * core), 1.0);
}
