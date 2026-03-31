import { drawSkyFrame } from "./renderer.js";
import { createDerivedScene, createViewport } from "./projection.js";
import { createStars, getStarCount } from "./stars.js";

export const createSky = (canvas, config) => {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    stars: [],
    viewport: createViewport(1, 1, config.fieldOfView),
    derived: createDerivedScene(config),
    animationFrame: 0,
    lastTime: 0,
    startTime: performance.now(),
    pauseStartedAt: 0,
  };

  const regenerate = () => {
    state.stars = createStars(
      getStarCount({ width: state.width, height: state.height }, config),
      config
    );
  };

  const syncDerived = () => {
    state.derived = createDerivedScene(config);
    state.viewport = createViewport(state.width, state.height, config.fieldOfView);
  };

  const resize = () => {
    const { innerWidth, innerHeight, devicePixelRatio = 1 } = window;

    state.width = innerWidth;
    state.height = innerHeight;
    state.dpr = Math.min(devicePixelRatio, config.dprCap);

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;

    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    syncDerived();
    regenerate();
  };

  const animate = (now) => {
    const elapsed = (now - state.startTime) * 0.001;
    const delta = state.lastTime ? (now - state.lastTime) * 0.001 : 0.016;

    state.lastTime = now;

    drawSkyFrame({
      ctx: context,
      stars: state.stars,
      config,
      derived: state.derived,
      viewport: state.viewport,
      elapsed,
      delta: Math.min(delta, 0.1),
    });

    state.animationFrame = window.requestAnimationFrame(animate);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      state.pauseStartedAt = performance.now();
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
      return;
    }

    if (state.pauseStartedAt) {
      state.startTime += performance.now() - state.pauseStartedAt;
      state.pauseStartedAt = 0;
    }

    state.lastTime = 0;

    if (!state.animationFrame) {
      state.animationFrame = window.requestAnimationFrame(animate);
    }
  };

  const applyConfig = () => {
    syncDerived();
    resize();
  };

  const dispose = () => {
    window.cancelAnimationFrame(state.animationFrame);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    state.animationFrame = 0;
  };

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  state.animationFrame = window.requestAnimationFrame(animate);

  return {
    config,
    regenerate,
    applyConfig,
    dispose,
  };
};
