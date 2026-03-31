const formatFps = (fps) => `${String(Math.round(fps || 0)).padStart(2, "0")} FPS`;

export const createFpsCounter = (sky) => {
  const counter = document.createElement("output");
  counter.className = "fps-counter";
  counter.textContent = formatFps(0);

  const update = () => {
    const { fps, starCount } = sky.getStats();
    counter.textContent = formatFps(fps);
    counter.title = `${starCount.toLocaleString("en-US")} stars`;
    window.setTimeout(update, 250);
  };

  update();

  return counter;
};
