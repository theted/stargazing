import { createRenderScratch, drawSkyFrame } from "./renderer.js";
import { createDerivedScene, createViewport } from "./projection.js";
import { createStars, getStarCount } from "./stars.js";
import { copySkyConfigSourceToClipboard, formatSkyConfigSource } from "./config-source.js";
import { createMeteorSystem, resetMeteorSystem } from "./meteors.js";
import { sampleSkyDriftVelocity } from "./motion.js";

export const createSky = (canvas, config) => {
  const context = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });

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
    meteorSystem: createMeteorSystem(config),
    scratch: createRenderScratch(),
    animationFrame: 0,
    lastTime: 0,
    startTime: performance.now(),
    pauseStartedAt: 0,
    skyDrift: 0,
    fps: 0,
    fpsFrames: 0,
    fpsElapsed: 0,
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
    const { devicePixelRatio = 1 } = window;
    const bounds = canvas.getBoundingClientRect();

    state.width = Math.max(1, Math.round(bounds.width || window.innerWidth));
    state.height = Math.max(1, Math.round(bounds.height || window.innerHeight));
    state.dpr = Math.min(devicePixelRatio, config.dprCap);

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);

    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    syncDerived();
    regenerate();
    resetMeteorSystem(state.meteorSystem, config);
  };

  const animate = (now) => {
    const elapsed = (now - state.startTime) * 0.001;
    const delta = state.lastTime ? (now - state.lastTime) * 0.001 : 0.016;

    state.lastTime = now;
    state.fpsFrames += 1;
    state.fpsElapsed += delta;

    if (state.fpsElapsed >= 0.25) {
      state.fps = state.fpsFrames / state.fpsElapsed;
      state.fpsFrames = 0;
      state.fpsElapsed = 0;
    }

    state.skyDrift += sampleSkyDriftVelocity({
      elapsed,
      config,
    }) * delta;

    drawSkyFrame({
      ctx: context,
      stars: state.stars,
      config,
      derived: state.derived,
      meteorSystem: state.meteorSystem,
      scratch: state.scratch,
      skyDrift: state.skyDrift,
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
    state.fpsFrames = 0;
    state.fpsElapsed = 0;

    if (!state.animationFrame) {
      state.animationFrame = window.requestAnimationFrame(animate);
    }
  };

  const applyConfig = () => {
    resize();
  };

  const copyConfigToClipboard = () => copySkyConfigSourceToClipboard(config);

  const getConfigSource = () => formatSkyConfigSource(config);

  const getStats = () => ({
    fps: state.fps,
    starCount: state.stars.length,
    meteorCount: state.meteorSystem.active.length,
    width: state.width,
    height: state.height,
  });

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
    copyConfigToClipboard,
    getConfigSource,
    getStats,
    resize,
    dispose,
  };
};
