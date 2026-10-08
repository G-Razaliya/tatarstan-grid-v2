export function initializeStars(starsCanvas) {
  const starsCtx = starsCanvas.getContext("2d");
  let stars = [];

  function resizeStars() {
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;
    generateStars();
  }
  function generateStars() {
    const count = Math.floor((starsCanvas.width * starsCanvas.height) / 8000);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.6 + 0.3,
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  function drawStars(t) {
    starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    stars.forEach(s => {
      const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase));
      starsCtx.beginPath();
      starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      starsCtx.fillStyle = `rgba(200, 220, 255, ${a})`;
      starsCtx.fill();
    });
  }
  window.addEventListener("resize", resizeStars);
  resizeStars();
  function starLoop(ts) {
    drawStars(ts / 1000);
    requestAnimationFrame(starLoop);
  }
  requestAnimationFrame(starLoop);
}
