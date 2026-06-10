const formatFps = (fps) => `${String(Math.round(fps || 0)).padStart(2, "0")} FPS`;

export const createFpsCounter = (sky) => {
  const counter = document.createElement("output");
  counter.className = "fps-counter";
  counter.textContent = formatFps(0);

  const update = () => {
    if (!counter.isConnected) {
      return;
    }

    const { fps, starCount, drawnStarCount, quality, meteorCount, satelliteCount, width, height } =
      sky.getStats();
    counter.textContent = formatFps(fps);
    counter.title =
      `${width} x ${height} · ` +
      `${(drawnStarCount ?? starCount).toLocaleString("en-US")} / ${starCount.toLocaleString("en-US")} stars · ` +
      `quality ${Math.round((quality ?? 1) * 100)}% · ` +
      `${meteorCount} meteors · ${satelliteCount ?? 0} satellites`;
    window.setTimeout(update, 250);
  };

  window.requestAnimationFrame(update);

  return counter;
};
