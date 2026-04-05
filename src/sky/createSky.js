import { createRenderScratch, drawSkyFrame } from "./renderer.js";
import { createDerivedScene, createViewport } from "./projection.js";
import { createStars, getStarCount } from "./stars.js";
import { createNebulae } from "./nebulae.js";
import { copySkyConfigSourceToClipboard, formatSkyConfigSource } from "./config-source.js";
import { createMeteorSystem, resetMeteorSystem } from "./meteors.js";
import { sampleSkyDriftVelocity } from "./motion.js";
import { clamp, lerp, smoothstep } from "./math.js";

const clampAltitude = (alt) => clamp(alt, 5, 89);
const clampFov = (fov) => clamp(fov, 15, 170);
const MAX_CAMERA_VELOCITY = 200; // deg/s

export const createSky = (canvas, config) => {
  const context = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });

  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  // Offscreen accumulation buffer for persistence trails (opaque, no alpha)
  const trailCanvas = document.createElement("canvas");
  let trailCtx = null;

  const ensureTrailCanvas = (width, height, dpr) => {
    trailCanvas.width = Math.round(width * dpr);
    trailCanvas.height = Math.round(height * dpr);
    trailCtx = trailCanvas.getContext("2d", { alpha: false });
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trailCtx.fillStyle = "#030509";
    trailCtx.fillRect(0, 0, width, height);
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    stars: [],
    nebulae: createNebulae(),
    viewport: createViewport(1, 1, config.fieldOfView, config.fisheyeEnabled),
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

  // ─── Camera drag state ────────────────────────────────────────────────────
  const drag = {
    active: false,
    startX: 0,
    startY: 0,
    startAzimuth: 0,
    startAltitude: 0,
    prevX: 0,
    prevY: 0,
    prevTime: 0,
    velAz: 0,
    velAlt: 0,
  };

  const syncDerived = () => {
    state.derived = createDerivedScene(config);
    state.viewport = createViewport(
      state.width,
      state.height,
      config.fieldOfView,
      config.fisheyeEnabled
    );
  };

  const regenerate = () => {
    state.stars = createStars(
      getStarCount({ width: state.width, height: state.height }, config),
      config
    );
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
    ensureTrailCanvas(state.width, state.height, state.dpr);
  };

  // ─── Camera interaction ───────────────────────────────────────────────────
  const getSensitivity = () =>
    (config.fieldOfView * 1.5) / Math.min(state.width, state.height);

  const beginDrag = (x, y) => {
    if (config.guidedTourEnabled) return;
    drag.active = true;
    drag.startX = x;
    drag.startY = y;
    drag.startAzimuth = config.lookAzimuth;
    drag.startAltitude = config.lookAltitude;
    drag.prevX = x;
    drag.prevY = y;
    drag.prevTime = performance.now();
    drag.velAz = 0;
    drag.velAlt = 0;
    canvas.style.cursor = "grabbing";
  };

  const moveDrag = (x, y) => {
    if (!drag.active) return;

    const sensitivity = getSensitivity();
    const dx = x - drag.startX;
    const dy = y - drag.startY;

    config.lookAzimuth = drag.startAzimuth - dx * sensitivity;
    config.lookAltitude = clampAltitude(drag.startAltitude + dy * sensitivity);

    const now = performance.now();
    const dt = (now - drag.prevTime) * 0.001;
    if (dt > 0.001) {
      const ddx = x - drag.prevX;
      const ddy = y - drag.prevY;
      const rawVelAz = (-ddx * sensitivity) / dt;
      const rawVelAlt = (ddy * sensitivity) / dt;
      drag.velAz = clamp(rawVelAz, -MAX_CAMERA_VELOCITY, MAX_CAMERA_VELOCITY);
      drag.velAlt = clamp(rawVelAlt, -MAX_CAMERA_VELOCITY, MAX_CAMERA_VELOCITY);
    }

    drag.prevX = x;
    drag.prevY = y;
    drag.prevTime = now;

    syncDerived();
  };

  const endDrag = () => {
    if (!drag.active) return;
    drag.active = false;
    canvas.style.cursor = config.guidedTourEnabled ? "default" : "grab";
  };

  // Mouse
  canvas.addEventListener("mousedown", (e) => {
    // Ignore clicks that land inside the controls panel or FPS badge
    if (e.target !== canvas) return;
    beginDrag(e.clientX, e.clientY);
    e.preventDefault();
  });

  const handleMouseMove = (e) => moveDrag(e.clientX, e.clientY);
  const handleMouseUp = () => endDrag();

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  // Touch
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        beginDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 1) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", endDrag);
  canvas.addEventListener("touchcancel", endDrag);

  // Scroll to zoom FOV
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (e.target !== canvas) return;
      config.fieldOfView = clampFov(config.fieldOfView + e.deltaY * 0.055);
      syncDerived();
      e.preventDefault();
    },
    { passive: false }
  );

  canvas.style.cursor = "grab";

  // ─── Guided tour ──────────────────────────────────────────────────────────
  // Slow autonomous camera drift through interesting positions.
  // Each waypoint is [azimuth, altitude]. The tour advances in a cycle.
  const TOUR_WAYPOINTS = [
    [28, 62],
    [110, 55],
    [195, 70],
    [-60, 48],
    [320, 68],
    [15, 80],
  ];
  const tourState = {
    waypointIndex: 0,
    progress: 0, // 0–1 through current segment
  };
  const TOUR_SEGMENT_DURATION = 18; // seconds per waypoint transition

  const advanceTour = (delta) => {
    if (!config.guidedTourEnabled) return;

    tourState.progress += delta / TOUR_SEGMENT_DURATION;

    if (tourState.progress >= 1) {
      tourState.progress -= 1;
      tourState.waypointIndex = (tourState.waypointIndex + 1) % TOUR_WAYPOINTS.length;
    }

    const from = TOUR_WAYPOINTS[tourState.waypointIndex];
    const to = TOUR_WAYPOINTS[(tourState.waypointIndex + 1) % TOUR_WAYPOINTS.length];
    const t = smoothstep(0, 1, tourState.progress);

    config.lookAzimuth = lerp(from[0], to[0], t);
    config.lookAltitude = clampAltitude(lerp(from[1], to[1], t));
    syncDerived();
  };

  // ─── Animation loop ───────────────────────────────────────────────────────
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

    // Guided tour advances camera autonomously
    advanceTour(delta);

    // Camera inertia — apply momentum after manual drag release
    if (!drag.active && !config.guidedTourEnabled) {
      const inertia = Math.pow(config.cameraInertia ?? 0.97, delta * 60);
      const speed = Math.hypot(drag.velAz, drag.velAlt);
      if (speed > 0.05) {
        config.lookAzimuth -= drag.velAz * delta;
        config.lookAltitude = clampAltitude(config.lookAltitude + drag.velAlt * delta);
        drag.velAz *= inertia;
        drag.velAlt *= inertia;
        syncDerived();
      }
    }

    state.skyDrift += sampleSkyDriftVelocity({ elapsed, config }) * delta;

    drawSkyFrame({
      ctx: context,
      stars: state.stars,
      nebulae: state.nebulae,
      config,
      derived: state.derived,
      meteorSystem: state.meteorSystem,
      scratch: state.scratch,
      trailCtx,
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
    canvas.style.cursor = config.guidedTourEnabled ? "default" : "grab";
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
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
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
