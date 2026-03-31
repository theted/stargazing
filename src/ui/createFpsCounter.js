const formatFps = (fps) => `${String(Math.round(fps || 0)).padStart(2, "0")} FPS`;

export const createFpsCounter = (sky) => {
  const counter = document.createElement("output");
  counter.className = "fps-counter";
  counter.textContent = formatFps(0);

  const update = () => {
    if (!counter.isConnected) {
      return;
    }

    const { fps, starCount, meteorCount, width, height } = sky.getStats();
    counter.textContent = formatFps(fps);
    counter.title =
      `${width} x ${height} · ` +
      `${starCount.toLocaleString("en-US")} stars · ${meteorCount} meteors`;
    window.setTimeout(update, 250);
  };

  window.requestAnimationFrame(update);

  return counter;
};
