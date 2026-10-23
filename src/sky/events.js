// Transient things in the sky: meteors streaming from a shower radiant (plus the odd
// sporadic one) and satellites gliding slowly across before slipping into Earth's
// shadow. Pure state updates with an injected random source; all directions are in the
// horizontal frame (east, north, up), since both happen above the observer, not among
// the stars.

import { clamp, cross3, dot3, lerp, normalize3 } from "./math.js";

const rotateAbout = (vector, axis, angle) => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const across = cross3(axis, vector);
  const along = dot3(axis, vector) * (1 - cosine);
  return [
    vector[0] * cosine + across[0] * sine + axis[0] * along,
    vector[1] * cosine + across[1] * sine + axis[1] * along,
    vector[2] * cosine + across[2] * sine + axis[2] * along,
  ];
};

const randomSkyDirection = (random, minAltitude, maxAltitude) => {
  const sinAlt = lerp(Math.sin(minAltitude), Math.sin(maxAltitude), random());
  const cosAlt = Math.sqrt(1 - sinAlt * sinAlt);
  const azimuth = random() * Math.PI * 2;
  return [cosAlt * Math.sin(azimuth), cosAlt * Math.cos(azimuth), sinAlt];
};

const exponentialDelay = (random, perMinute) =>
  perMinute > 0 ? (-Math.log(Math.max(random(), 1e-6)) * 60) / perMinute : Infinity;

// ─── Meteors ────────────────────────────────────────────────────────────────

export const createMeteorSystem = ({ random = Math.random, rate = 2.4 } = {}) => ({
  random,
  rate,
  active: [],
  cooldown: exponentialDelay(random, rate) * 0.5,
});

// `radiant` is the shower radiant in the horizontal frame (or null when it is below
// the horizon, which leaves only sporadic meteors). `near`, when given, places the
// meteor's path through that direction.
export const spawnMeteor = (random, radiant, near = null) => {
  const fireball = random() < 0.08;
  const fromShower = radiant && radiant[2] > 0.05 && random() < 0.7;
  let start;
  let axis;

  if (near) {
    const separation = radiant ? Math.acos(clamp(dot3(near, radiant), -1, 1)) : 0;
    axis =
      fromShower && separation > 0.1
        ? normalize3(cross3(radiant, near))
        : normalize3(cross3(near, randomSkyDirection(random, -1.2, 1.2)));
    // Start a little before the chosen point so the streak passes through it.
    start = rotateAbout(near, axis, -lerp(0.03, 0.08, random()));
  } else if (fromShower) {
    // Meteors appear some way from the radiant and race directly away from it.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      start = randomSkyDirection(random, 0.2, 1.3);
      const separation = Math.acos(clamp(dot3(start, radiant), -1, 1));
      if (separation > 0.25 && separation < 1.6) break;
    }
    axis = normalize3(cross3(radiant, start));
  } else {
    start = randomSkyDirection(random, 0.2, 1.3);
    axis = normalize3(cross3(start, randomSkyDirection(random, -1.2, 1.2)));
  }

  const length = (fireball ? lerp(18, 40, random()) : lerp(5, 22, random())) * (Math.PI / 180);
  const end = rotateAbout(start, axis, length);

  return {
    start,
    end,
    age: 0,
    duration: (fireball ? lerp(1.1, 2.2, random()) : lerp(0.35, 1.0, random())) * (0.6 + length * 1.4),
    trainLife: fireball ? lerp(2.5, 5, random()) : lerp(0.5, 1.4, random()),
    brightness: fireball ? lerp(5, 12, random()) : lerp(0.6, 2.8, random()) * lerp(0.4, 1, random()),
    // Fast shower meteors burn green-blue at the head; slow sporadics run warmer.
    hue: fromShower ? lerp(0.55, 0.9, random()) : lerp(0.1, 0.5, random()),
    fireball,
  };
};

export const updateMeteors = (system, dt, radiant, maxActive = 3) => {
  for (let index = system.active.length - 1; index >= 0; index -= 1) {
    const meteor = system.active[index];
    meteor.age += dt;
    if (meteor.age > meteor.duration + meteor.trainLife) {
      system.active.splice(index, 1);
    }
  }

  system.cooldown -= dt;
  while (system.cooldown <= 0) {
    if (system.active.length < maxActive) {
      system.active.push(spawnMeteor(system.random, radiant));
    }
    system.cooldown += exponentialDelay(system.random, system.rate);
  }

  return system;
};

// ─── Satellites ─────────────────────────────────────────────────────────────

export const createSatelliteSystem = ({ random = Math.random, rate = 0.9 } = {}) => ({
  random,
  rate,
  active: [],
  cooldown: exponentialDelay(random, rate) * 0.4,
});

export const spawnSatellite = (random) => {
  // A great circle through a random point overhead-ish, crossed at orbital pace.
  const through = randomSkyDirection(random, 0.35, 1.45);
  const axis = normalize3(cross3(through, randomSkyDirection(random, -0.3, 0.3)));
  const speed = lerp(0.6, 1.4, random()) * (Math.PI / 180);
  const duration = lerp(25, 60, random());

  return {
    axis,
    origin: rotateAbout(through, axis, -speed * duration * 0.5),
    speed,
    age: 0,
    duration,
    magnitude: lerp(3.2, 5.2, random()),
    fade: lerp(2, 5, random()),
  };
};

export const satellitePosition = (satellite) =>
  rotateAbout(satellite.origin, satellite.axis, satellite.speed * satellite.age);

// Brightness 0…1: fades in out of twilight and out into Earth's shadow.
export const satelliteVisibility = (satellite) =>
  clamp(satellite.age / satellite.fade, 0, 1) * clamp((satellite.duration - satellite.age) / satellite.fade, 0, 1);

export const updateSatellites = (system, dt, maxActive = 2) => {
  for (let index = system.active.length - 1; index >= 0; index -= 1) {
    const satellite = system.active[index];
    satellite.age += dt;
    if (satellite.age > satellite.duration) {
      system.active.splice(index, 1);
    }
  }

  system.cooldown -= dt;
  while (system.cooldown <= 0) {
    if (system.active.length < maxActive) {
      system.active.push(spawnSatellite(system.random));
    }
    system.cooldown += exponentialDelay(system.random, system.rate);
  }

  return system;
};
