/* -----------------------------
   Stable Gray-Scott (low-res) reaction-diffusion
   - circular seeding that grows
   - offscreen sim -> scaled draw (fast, no flicker)
   - oversized canvas so scrolling never exposes gaps
------------------------------*/

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

// offscreen sim canvas used for rendering
const simCanvas = document.createElement("canvas");
const simCtx = simCanvas.getContext("2d");

let canvasW = 0, canvasH = 0;
let simW = 360, simH = 220; // medium sim resolution (tuned for growth)
let A, B, A2, B2;
let running = true;

// Growth-friendly Gray-Scott parameters
const dA = 1.0;
const dB = 0.5;
const feed = 0.0275;
const kill = 0.062;

// Resize canvases and (re)initialize arrays
function resizeAll() {
  // Oversized canvas to avoid scroll gaps
  canvasW = Math.round(window.innerWidth * 1.5);
  canvasH = Math.round(window.innerHeight * 1.5);
  canvas.width = canvasW;
  canvas.height = canvasH;

  // keep sim aspect similar to canvas
  const aspect = canvasW / canvasH;
  simW = Math.max(160, Math.min(600, Math.round(360 * aspect)));
  simH = Math.max(120, Math.round(simW / aspect));

  simCanvas.width = simW;
  simCanvas.height = simH;

  // allocate sim buffers
  A = new Float32Array(simW * simH).fill(1.0);
  B = new Float32Array(simW * simH).fill(0.0);
  A2 = new Float32Array(simW * simH);
  B2 = new Float32Array(simW * simH);

  // initial circular seeds
  seedCircularBlobsSim(12, Math.floor(Math.min(simW, simH) * 0.06));
}

window.addEventListener("resize", resizeAll);
resizeAll();

/* -----------------------------
   Seeding: circular blobs
------------------------------*/
function seedCircularBlobsSim(num = 10, radius = 12) {
  for (let n = 0; n < num; n++) {
    const cx = Math.floor(Math.random() * simW);
    const cy = Math.floor(Math.random() * simH);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = cx + dx;
        const sy = cy + dy;
        if (sx <= 1 || sy <= 1 || sx >= simW - 1 || sy >= simH - 1) continue;

        const d2 = dx*dx + dy*dy;
        if (d2 <= radius*radius) {
          const idx = sx + sy * simW;
          const dist = Math.sqrt(d2) / radius;
          const intensity = 1.0 - dist * 0.9;

          B[idx] = Math.max(B[idx], intensity * (0.6 + Math.random()*0.4));
          A[idx] = Math.min(A[idx], 1.0 - intensity * 0.2);
        }
      }
    }
  }
}

// small circular spot injections
function addRandomCircularSpotsSim(count = 20, radius = 2) {
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(Math.random() * simW);
    const cy = Math.floor(Math.random() * simH);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = cx + dx;
        const sy = cy + dy;
        if (sx <= 1 || sy <= 1 || sx >= simW - 1 || sy >= simH - 1) continue;

        if (dx*dx + dy*dy <= radius*radius) {
          const idx = sx + sy * simW;
          B[idx] = Math.max(B[idx], 0.5 * Math.random() + 0.2);
        }
      }
    }
  }
}

/* -----------------------------
   Laplacian (5-point)
------------------------------*/
function laplaceSim(arr, x, y) {
  const idx = x + y * simW;
  return (
    arr[idx] * -1 +
    arr[idx - 1] * 0.25 +
    arr[idx + 1] * 0.25 +
    arr[idx - simW] * 0.25 +
    arr[idx + simW] * 0.25
  );
}

/* -----------------------------
   Simulation step (Gray-Scott)
------------------------------*/
function stepSim() {
  for (let y = 1; y < simH - 1; y++) {
    for (let x = 1; x < simW - 1; x++) {
      const i = x + y * simW;
      const a = A[i], b = B[i];
      const reaction = a * b * b;

      const aNext = a + (dA * laplaceSim(A, x, y) - reaction + feed * (1 - a));
      const bNext = b + (dB * laplaceSim(B, x, y) + reaction - (kill + feed) * b);

      A2[i] = Math.min(1, Math.max(0, aNext));
      B2[i] = Math.min(1, Math.max(0, bNext));
    }
  }

  [A, A2] = [A2, A];
  [B, B2] = [B2, B];
}

/* -----------------------------
   Render simulation -> canvas
------------------------------*/
function renderSimToCanvas() {
  // ✨ PREVENT SHIMMER — disable smoothing
  ctx.imageSmoothingEnabled = false;
  simCtx.imageSmoothingEnabled = false;

  const img = simCtx.createImageData(simW, simH);
  const data = img.data;

  for (let i = 0; i < simW * simH; i++) {
    const diff = A[i] - B[i];
    const v = Math.floor(Math.min(255, Math.max(0, diff * 160 + 128)));

    const r = Math.min(255, Math.max(0, v + 30));
    const g = Math.min(255, Math.max(0, v - 6));
    const b = Math.min(255, Math.max(0, v + 8));

    const p = i * 4;
    data[p] = r;
    data[p+1] = g;
    data[p+2] = b;
    data[p+3] = 255;
  }

  simCtx.putImageData(img, 0, 0);

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.drawImage(simCanvas, 0, 0, canvasW, canvasH);
}

/* -----------------------------
   Keep dynamic
------------------------------*/
setInterval(() => addRandomCircularSpotsSim(24, 2), 2000);
setInterval(() => seedCircularBlobsSim(2, Math.floor(Math.min(simW, simH) * 0.06)), 9000);

/* -----------------------------
   Main loop
------------------------------*/
function loop() {
  if (running) {
    stepSim();
    stepSim();
    stepSim();
    renderSimToCanvas();
  }

  const offsetY = window.scrollY * 0.18;
  canvas.style.transform = `translateY(${offsetY}px)`;

  requestAnimationFrame(loop);
}
loop();

/* -----------------------------
   Controls
------------------------------*/
document.getElementById("pauseBtn").addEventListener("click", () => {
  running = !running;
  document.getElementById("pauseBtn").textContent = running ? "Pause" : "Resume";
});

document.getElementById("clearBtn").addEventListener("click", () => {
  seedCircularBlobsSim(12, Math.floor(Math.min(simW, simH) * 0.06));
});

/* -----------------------------
   Scroll Buttons
------------------------------*/
const btnContent = document.getElementById("btnContent");
const btnWork = document.getElementById("btnWork");
const workSection = document.getElementById("workSection");
const contentSection = document.getElementById("contentSection");

if (btnContent && contentSection) btnContent.addEventListener("click", () => contentSection.scrollIntoView({behavior:'smooth'}));
if (btnWork && workSection) btnWork.addEventListener("click", () => workSection.scrollIntoView({behavior:'smooth'}));
