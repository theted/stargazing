// Runtime: owns the WebGL context, input, resize/visibility handling and the animation
// loop, and turns settings + time into the per-frame state the renderer draws.

import { QUALITY_TIERS, RENDER_TUNING, SKY_DEFAULTS } from "./config.js";
import { getPlace } from "./places.js";
import { SIDEREAL_RATE, equatorialToHorizontalMatrix, raDecToVector } from "./astro.js";
import { createCamera, dragCamera, glideCamera, releaseCamera, setCameraView, updateCamera, zoomCamera } from "./camera.js";
import { DEG, clamp, mat3, mat3Multiply, mat3Row, mat3TransformVec3, mat3Transpose, slerp3, smoothstep } from "./math.js";
import { altitudeForHorizon, createViewport, horizontalToViewMatrix, unprojectPoint } from "./projection.js";
import { STAR_STRIDE, createBrightStarData, generateBandStars } from "./stars.js";
import {
  createMeteorSystem,
  createSatelliteSystem,
  spawnMeteor,
  satellitePosition,
  satelliteVisibility,
  updateMeteors,
  updateSatellites,
} from "./events.js";
import { createPlaceUniforms } from "./render/placeUniforms.js";
import { MAX_DYNAMIC_STARS, createRenderer } from "./render/renderer.js";

const TIME_WRAP_SECONDS = 4096;

export const detectQuality = () => {
  if (typeof window === "undefined") return "medium";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse) return cores >= 8 ? "medium" : "low";
  return cores >= 8 ? "high" : "medium";
};

const definedEntries = (object = {}) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

export const mergeSettings = (options = {}) => ({
  ...SKY_DEFAULTS,
  ...definedEntries(options),
  layers: { ...SKY_DEFAULTS.layers, ...definedEntries(options.layers) },
});

export const createSky = (canvas, options = {}) => {
  const settings = mergeSettings(options);
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    throw new Error("WebGL2 is not available.");
  }

  const qualityName = settings.quality === "auto" ? detectQuality() : settings.quality;
  const quality = QUALITY_TIERS[qualityName] ?? QUALITY_TIERS.medium;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const brightStars = createBrightStarData({ colorSaturation: RENDER_TUNING.starSaturation });
  // Field stars wait for the baked galaxy so they can follow its clouds and lanes.
  let fieldStars = { data: new Float32Array(0), count: 0, limit: 0 };
  const renderer = createRenderer(gl, {
    bakeSize: quality.bakeSize,
    brightStars,
    fieldStars,
    trailSegments: quality.trailSegments,
  });

  // Once the galaxy is baked: read its light back (asynchronously), then scatter the
  // faint stars along it a few milliseconds per frame so the intro never stutters.
  const bandStars = { read: null, task: null, done: false };
  const SLICE_MILLISECONDS = 5;

  const advanceBandStars = () => {
    if (bandStars.done || !renderer.bakeDone) return;

    if (!bandStars.read) {
      bandStars.read = renderer.readMilkyWayLuminanceAsync(128);
      return;
    }

    if (!bandStars.task) {
      const map = bandStars.read.poll();
      if (map) {
        bandStars.task = generateBandStars({
          ...map,
          fieldCount: quality.fieldStars,
          dustCount: quality.dustStars,
          fieldSaturation: RENDER_TUNING.fieldStarSaturation,
          fieldBandShare: RENDER_TUNING.fieldBandShare,
        });
      }
      return;
    }

    const deadline = performance.now() + SLICE_MILLISECONDS;
    let step;
    do {
      step = bandStars.task.next();
    } while (!step.done && performance.now() < deadline);

    if (step.done) {
      fieldStars = step.value.field;
      renderer.setFieldStars(step.value.field);
      renderer.setDustStars(step.value.dust);
      bandStars.done = true;
    }
  };

  let place = getPlace(settings.place);
  let placeUniforms = createPlaceUniforms(place);
  let radiant = raDecToVector((place.meteorRadiant.ra / 24) * Math.PI * 2, place.meteorRadiant.dec * DEG);
  const camera = createCamera(settings.view ?? { ...place.view, altitude: 25 });
  const meteors = createMeteorSystem({ rate: RENDER_TUNING.meteorsPerMinute });
  const satellites = createSatelliteSystem({ rate: RENDER_TUNING.satellitesPerMinute });

  const state = {
    width: 1,
    height: 1,
    cssWidth: 1,
    cssHeight: 1,
    pixelRatio: 1,
    lst: ((settings.lst ?? place.startLst) / 24) * Math.PI * 2,
    time: 0,
    introElapsed: settings.intro ? 0 : RENDER_TUNING.introSeconds,
    trailAngle: 0,
    auroraTime: 200,
    // Place changes fade through darkness: curtain 1 = fully visible.
    curtain: 1,
    pendingPlace: null,
    lastFrame: 0,
    frameHandle: 0,
    running: false,
    fps: 0,
    fpsFrames: 0,
    fpsElapsed: 0,
  };

  const matrices = {
    equatorialToHorizontal: mat3(),
    horizontalToView: mat3(),
    equatorialToView: mat3(),
    viewToHorizontal: mat3(),
    horizontalToEquatorial: mat3(),
  };

  const frame = {
    width: 1,
    height: 1,
    cx: 0,
    cy: 0,
    scale: 1,
    equatorialToView: matrices.equatorialToView,
    horizontalToView: matrices.horizontalToView,
    viewToHorizontal: matrices.viewToHorizontal,
    horizontalToEquatorial: matrices.horizontalToEquatorial,
    zenith: new Float32Array(3),
    extinction: new Float32Array(3),
    time: 0,
    exposure: 1,
    fade: 1,
    referenceMagnitude: RENDER_TUNING.referenceMagnitude,
    alpha: RENDER_TUNING.projectionAlpha,
    sigma: 1,
    skirtSigma: 1,
    glowSigma: 1,
    haloRatio: new Float32Array([RENDER_TUNING.skirtRatio, RENDER_TUNING.glowRatio]),
    haloKnee: new Float32Array([RENDER_TUNING.skirtKnee, RENDER_TUNING.glowKnee]),
    fieldBoost: RENDER_TUNING.fieldBoost,
    dustBoost: RENDER_TUNING.dustBoost,
    maxRadius: 100,
    twinkle: 1,
    milkyWayGain: RENDER_TUNING.milkyWayGain,
    trailAngle: 0,
    trailStars: quality.trailStars,
    trailGain: RENDER_TUNING.trailGain,
    trailFade: RENDER_TUNING.trailFade,
    trailDimming: 0,
    vignette: RENDER_TUNING.vignette,
    auroraStrength: 0,
    groundLight: new Float32Array(3),
    auroraTime: 0,
    auroraHeading: 0,
    meteors: [],
    dynamicStars: new Float32Array(MAX_DYNAMIC_STARS * STAR_STRIDE),
    dynamicCount: 0,
    bakeTiles: qualityName === "high" ? 6 : 3,
    debug: { allsky: 1, stars: 2, dust: 3 }[settings.debug] ?? 0,
    layers: settings.layers,
    place: placeUniforms,
  };

  // ─── Size ─────────────────────────────────────────────────────────────────

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    state.cssWidth = Math.max(1, bounds.width || window.innerWidth);
    state.cssHeight = Math.max(1, bounds.height || window.innerHeight);
    state.pixelRatio = Math.min(window.devicePixelRatio || 1, quality.dprCap);
    state.width = Math.max(1, Math.round(state.cssWidth * state.pixelRatio));
    state.height = Math.max(1, Math.round(state.cssHeight * state.pixelRatio));

    if (canvas.width !== state.width || canvas.height !== state.height) {
      canvas.width = state.width;
      canvas.height = state.height;
    }
  };

  // A place's framing depends on the screen: resolve its horizon line to an altitude.
  const frameView = (view) => ({
    ...view,
    altitude:
      view.altitude ??
      clamp(
        altitudeForHorizon(state.cssWidth, state.cssHeight, view.fov, RENDER_TUNING.projectionAlpha, view.horizon ?? 0.8),
        5,
        65
      ),
  });

  // ─── Frame state ──────────────────────────────────────────────────────────

  const prepareFrame = () => {
    const viewport = createViewport(state.width, state.height, camera.fov, RENDER_TUNING.projectionAlpha);
    const tuning = RENDER_TUNING;
    const latitude = place.latitude * DEG;

    equatorialToHorizontalMatrix(state.lst, latitude, matrices.equatorialToHorizontal);
    horizontalToViewMatrix(camera.azimuth, camera.altitude, 0, matrices.horizontalToView);
    mat3Multiply(matrices.horizontalToView, matrices.equatorialToHorizontal, matrices.equatorialToView);
    mat3Transpose(matrices.horizontalToView, matrices.viewToHorizontal);
    mat3Transpose(matrices.equatorialToHorizontal, matrices.horizontalToEquatorial);
    frame.zenith.set(mat3Row(matrices.equatorialToHorizontal, 2));

    const intro = smoothstep(0, 1, state.introElapsed / tuning.introSeconds) * smoothstep(0, 1, state.curtain);
    // Dark adaptation: the sky brightens first, the faintest stars arrive last.
    const exposure = tuning.exposure * Math.max(intro * intro, 1e-4);
    const zoomBoost = Math.pow(tuning.referenceFov / camera.fov, tuning.zoomGain * 2);
    const k = settings.layers.atmosphere ? place.atmosphere.extinction * 0.921 : 0;

    frame.width = state.width;
    frame.height = state.height;
    frame.cx = viewport.cx;
    frame.cy = viewport.cy;
    frame.scale = viewport.scale;
    frame.time = state.time;
    frame.exposure = exposure;
    frame.fade = intro;
    frame.referenceMagnitude = tuning.referenceMagnitude + 2.5 * Math.log10(exposure * zoomBoost);
    frame.extinction.set(tuning.extinctionColor.map((factor) => factor * k));
    frame.sigma = tuning.psfSigma * state.pixelRatio;
    frame.skirtSigma = tuning.skirtSigma * state.pixelRatio;
    frame.glowSigma = tuning.glowSigma * state.pixelRatio;
    frame.maxRadius = 0.2 * Math.min(state.width, state.height);
    frame.twinkle = settings.layers.twinkle && !reducedMotion ? tuning.twinkle : 0;
    frame.trailAngle = state.trailAngle;
    // Untrailed faint stars would sit as static dots among the trails, so they fade.
    frame.trailDimming = 2.2 * smoothstep(0, 2 * DEG, state.trailAngle);
    frame.auroraStrength = settings.layers.aurora ? place.atmosphere.aurora * intro : 0;
    frame.auroraTime = state.auroraTime;
    // Snow and sand pick up the sky's light; an aurora tints the ground green.
    frame.groundLight.set(
      placeUniforms.groundLight.map((value, index) => value + frame.auroraStrength * [0.0012, 0.005, 0.0026][index])
    );
    frame.auroraHeading = (place.atmosphere.auroraHeading ?? 0) * DEG;
    frame.layers = settings.layers;
    frame.place = placeUniforms;
    return frame;
  };

  // ─── Meteors and satellites ───────────────────────────────────────────────

  const writeDynamicStar = (horizontal, magnitude, color) => {
    if (frame.dynamicCount >= MAX_DYNAMIC_STARS) return;
    const direction = mat3TransformVec3(matrices.horizontalToEquatorial, horizontal);
    frame.dynamicStars.set([...direction, magnitude, ...color, 0.5], frame.dynamicCount * STAR_STRIDE);
    frame.dynamicCount += 1;
  };

  const updateEvents = (dt) => {
    const enabled = !reducedMotion && state.introElapsed > RENDER_TUNING.introSeconds * 0.5;
    const radiantNow = mat3TransformVec3(matrices.equatorialToHorizontal, radiant);
    updateMeteors(meteors, enabled && settings.layers.meteors ? dt : 0, radiantNow);
    updateSatellites(satellites, enabled && settings.layers.satellites ? dt : 0);

    frame.meteors.length = 0;
    frame.dynamicCount = 0;

    if (settings.layers.meteors) {
      for (const meteor of meteors.active) {
        const head = meteor.age / meteor.duration;
        const afterglow = Math.max(0, meteor.age - meteor.duration) / meteor.trainLife;
        const lightCurve = Math.pow(Math.sin(Math.PI * clamp(head, 0.02, 1)), 0.6);
        const burning = head <= 1 ? 1 : Math.exp(-(head - 1) * 8);
        frame.meteors.push({
          start: meteor.start,
          end: meteor.end,
          head,
          wake: meteor.fireball ? 0.16 : 0.09,
          brightness: meteor.brightness * 0.32,
          train: (meteor.fireball ? 0.06 : 0.025) * smoothstep(0, 0.4, head) * Math.exp(-afterglow * 2.2),
          trainWidth: 1.6 + afterglow * 3,
          hue: meteor.hue,
        });

        const glow = meteor.brightness * lightCurve * burning;
        if (glow > 1e-3 && head <= 1.15) {
          const hot = [1 - 0.38 * meteor.hue, 0.94 + 0.06 * meteor.hue, 0.84 - 0.02 * meteor.hue];
          writeDynamicStar(slerp3(meteor.start, meteor.end, Math.min(head, 1)), 2.4 - 2.5 * Math.log10(glow), hot);
        }
      }
    }

    if (settings.layers.satellites) {
      for (const satellite of satellites.active) {
        const visibility = satelliteVisibility(satellite);
        if (visibility > 1e-3) {
          writeDynamicStar(satellitePosition(satellite), satellite.magnitude - 2.5 * Math.log10(visibility), [1, 0.97, 0.92]);
        }
      }
    }
  };

  // ─── Loop ─────────────────────────────────────────────────────────────────

  const tick = (now) => {
    state.frameHandle = window.requestAnimationFrame(tick);
    const dt = state.lastFrame ? clamp((now - state.lastFrame) / 1000, 0, 0.1) : 1 / 60;
    state.lastFrame = now;

    state.fpsFrames += 1;
    state.fpsElapsed += dt;
    if (state.fpsElapsed >= 0.5) {
      state.fps = state.fpsFrames / state.fpsElapsed;
      state.fpsFrames = 0;
      state.fpsElapsed = 0;
    }

    const timeScale = reducedMotion ? Math.min(settings.timeScale, 1) : settings.timeScale;
    state.lst = (state.lst + SIDEREAL_RATE * timeScale * dt) % (Math.PI * 2);

    // A trail grows like a real exposure (at least over a few seconds) and retracts
    // quickly when the shutter closes.
    const targetTrail = (settings.trails / 60 / 24) * Math.PI * 2 * 1.0027379;
    if (state.trailAngle < targetTrail) {
      const growth = Math.max(SIDEREAL_RATE * timeScale, targetTrail / 4);
      state.trailAngle = Math.min(targetTrail, state.trailAngle + growth * dt);
    } else {
      state.trailAngle = Math.max(targetTrail, state.trailAngle - Math.max(state.trailAngle, 0.05) * 1.5 * dt);
    }
    state.time = (state.time + dt) % TIME_WRAP_SECONDS;

    if (state.pendingPlace) {
      state.curtain = Math.max(0, state.curtain - dt / 0.7);
      if (state.curtain === 0) {
        applyPlace(state.pendingPlace);
        state.pendingPlace = null;
      }
    } else {
      state.curtain = Math.min(1, state.curtain + dt / 1.6);
    }
    // Aurora drifts in real time, a little quicker when the sky is racing.
    state.auroraTime += dt * (reducedMotion ? 0.2 : 1 + Math.min(timeScale, 120) / 60);
    state.introElapsed += dt;
    updateCamera(camera, dt);

    resize();
    prepareFrame();
    updateEvents(dt);
    renderer.draw(frame);

    advanceBandStars();
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    state.lastFrame = 0;
    state.frameHandle = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    state.running = false;
    window.cancelAnimationFrame(state.frameHandle);
  };

  const handleVisibility = () => (document.hidden ? stop() : start());

  // ─── Input ────────────────────────────────────────────────────────────────

  const pointers = new Map();
  let lastMoveTime = 0;
  let pinchDistance = 0;

  const degreesPerPixel = () => camera.fov / Math.sqrt(state.cssWidth * state.cssHeight);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastMoveTime = performance.now();
    camera.velocityAzimuth = 0;
    camera.velocityAltitude = 0;
    canvas.style.cursor = "grabbing";

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const handlePointerMove = (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;

    const now = performance.now();
    const dt = (now - lastMoveTime) / 1000;
    lastMoveTime = now;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size === 1) {
      dragCamera(camera, current.x - previous.x, current.y - previous.y, degreesPerPixel(), dt);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0 && distance > 0) zoomCamera(camera, pinchDistance / distance);
      pinchDistance = distance;
    }
  };

  const handlePointerUp = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size === 0) {
      releaseCamera(camera, (performance.now() - lastMoveTime) / 1000);
      canvas.style.cursor = "grab";
    }
    pinchDistance = 0;
  };

  const handleDoubleClick = (event) => {
    const bounds = canvas.getBoundingClientRect();
    api.triggerMeteor({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoomCamera(camera, Math.exp(pixels * 0.0012));
  };

  const listeners = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };

  if (settings.interactive) {
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    listen(canvas, "pointerdown", handlePointerDown);
    listen(canvas, "pointermove", handlePointerMove);
    listen(canvas, "pointerup", handlePointerUp);
    listen(canvas, "pointercancel", handlePointerUp);
    listen(canvas, "wheel", handleWheel, { passive: false });
    listen(canvas, "dblclick", handleDoubleClick);
  }

  listen(document, "visibilitychange", handleVisibility);

  // ─── Public API ───────────────────────────────────────────────────────────

  const applyPlace = (key) => {
    place = getPlace(key);
    settings.place = key;
    placeUniforms = createPlaceUniforms(place);
    radiant = raDecToVector((place.meteorRadiant.ra / 24) * Math.PI * 2, place.meteorRadiant.dec * DEG);
    state.lst = (place.startLst / 24) * Math.PI * 2;
    meteors.active.length = 0;
    satellites.active.length = 0;
    setCameraView(camera, frameView(place.view));
  };

  const api = {
    get settings() {
      return settings;
    },
    get place() {
      return place;
    },
    get camera() {
      return camera;
    },
    get localSiderealTime() {
      return state.lst;
    },
    get placeKey() {
      return settings.place;
    },
    // Switches site, fading through darkness unless `immediate`.
    setPlace: (key, { immediate = false } = {}) => {
      if (immediate) {
        applyPlace(key);
      } else if (key !== settings.place || state.pendingPlace) {
        state.pendingPlace = key;
      }
    },
    setTimeScale: (value) => {
      settings.timeScale = Math.max(0, value);
    },
    setTrails: (minutes) => {
      settings.trails = Math.max(0, minutes);
    },
    setLayer: (name, enabled) => {
      settings.layers[name] = Boolean(enabled);
    },
    resetView: () => glideCamera(camera, frameView(place.view)),
    // Launches a meteor now, optionally through a point given in CSS pixels;
    // `fireball: true` forces a bright one.
    triggerMeteor: ({ fireball = false, x, y } = {}) => {
      let first = true;
      const random = () => (first && fireball ? ((first = false), 0) : meteors.random());
      let near = null;
      if (x !== undefined && y !== undefined) {
        const viewport = createViewport(state.width, state.height, camera.fov, RENDER_TUNING.projectionAlpha);
        const view = unprojectPoint(x * state.pixelRatio, (state.cssHeight - y) * state.pixelRatio, viewport);
        near = mat3TransformVec3(matrices.viewToHorizontal, view);
      }
      meteors.active.push(spawnMeteor(random, mat3TransformVec3(matrices.equatorialToHorizontal, radiant), near));
    },
    getStats: () => ({
      fps: state.fps,
      width: state.width,
      height: state.height,
      quality: qualityName,
      stars: brightStars.count + fieldStars.count,
      dustStars: renderer.dustCount,
      fieldLimit: fieldStars.limit,
      bakeDone: renderer.bakeDone,
    }),
    dispose: () => {
      stop();
      listeners.forEach((remove) => remove());
      renderer.dispose();
    },
  };

  resize();
  if (!settings.view) setCameraView(camera, frameView(place.view));
  start();
  return api;
};
