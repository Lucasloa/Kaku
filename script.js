/* reaction-diffusion.js – Firefox-safe, oversized canvas, brown/purple palette */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

// Offscreen canvas (fixes Firefox flicker)
const offCanvas = document.createElement("canvas");
const offCtx = offCanvas.getContext("2d");

let canvasW, canvasH;
let simW = 240;
let simH = 140;

let A, B, A2, B2;
let running = true;

function resizeAll() {
  // OVERSIZED CANVAS — prevents white gaps when scrolling
  canvasW = Math.round(window.innerWidth * 2.0);
  canvasH = Math.round(window.innerHeight * 2.0);

  canvas.width = canvasW;
  canvas.height = canvasH;

  offCanvas.width = canvasW;
  offCanvas.height = canvasH;

  const aspect = canvasW / canvasH;
  simW = Math.max(200, Math.min(900, Math.round(400 * aspect)));
  simH = Math.max(120, Math.round(simW / aspect));

  A = new Float32Array(simW * simH).fill(1.0);
  B = new Float32Array(simW * simH).fill(0.0);
  A2 = new Float32Array(simW * simH);
  B2 = new Float32Array(simW * simH);

  seedSim();
}

window.addEventListener("resize", resizeAll);
resizeAll();

// Seed with center blob + noise
function seedSim() {
  for (let i = 0; i < simW * simH; i++) {
    A[i] = 1.0;
    B[i] = 0.0;
  }

  const cx = Math.floor(simW * 0.5);
  const cy = Math.floor(simH * 0.5);

  for (let y = cy - 6; y <= cy + 6; y++) {
    for (let x = cx - 12; x <= cx + 12; x++) {
      const i = x + y * simW;
      if (i >= 0 && i < simW * simH) {
        B[i] = 0.6 + Math.random() * 0.4;
        A[i] = 0.3 + Math.random() * 0.7;
      }
    }
  }

  for (let i = 0; i < 60; i++) {
    const rx = Math.floor(Math.random() * simW);
    const ry = Math.floor(Math.random() * simH);
    B[rx + ry * simW] = 0.7 * Math.random();
  }
}

function laplace(arr, x, y) {
  const i = x + y * simW;
  return (
    arr[i] * -1 +
    arr[i - 1] * 0.2 +
    arr[i + 1] * 0.2 +
    arr[i - simW] * 0.2 +
    arr[i + simW] * 0.2
  );
}

function stepSim() {
  const dA = 1.0,
    dB = 0.5;
  const feed = 0.037,
    kill = 0.06;

  for (let y = 1; y < simH - 1; y++) {
    for (let x = 1; x < simW - 1; x++) {
      const i = x + y * simW;
      const a = A[i],
        b = B[i];
      const reaction = a * b * b;

      A2[i] =
        Math.min(
          1,
          Math.max(
            0,
            a + (dA * laplace(A, x, y) - reaction + feed * (1 - a)) * 1.0
          )
        );

      B2[i] =
        Math.min(
          1,
          Math.max(
            0,
            b + (dB * laplace(B, x, y) + reaction - (kill + feed) * b) * 1.0
          )
        );
    }
  }

  let tmp = A;
  A = A2;
  A2 = tmp;

  tmp = B;
  B = B2;
  B2 = tmp;
}

function renderSimToCanvas() {
  const img = offCtx.createImageData(canvasW, canvasH);
  const data = img.data;

  const sx = canvasW / simW;
  const sy = canvasH / simH;

  for (let y = 0; y < simH; y++) {
    for (let x = 0; x < simW; x++) {
      const i = x + y * simW;

      const diff = A[i] - B[i];

      // ORIGINAL BROWN/PURPLE PALETTE (restored)
      const tone = Math.floor((diff * 150) + 120);
      const r = Math.min(255, tone + 25); 
      const g = Math.min(255, tone - 20);
      const b = Math.min(255, tone + 60);

      const px = Math.floor(x * sx);
      const py = Math.floor(y * sy);
      const wBlock = Math.ceil(sx);
      const hBlock = Math.ceil(sy);

      for (let yy = 0; yy < hBlock; yy++) {
        const row = (py + yy) * canvasW * 4;

        for (let xx = 0; xx < wBlock; xx++) {
          const col = (px + xx) * 4;
          const idx = row + col;
          if (idx + 3 < data.length) {
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  offCtx.putImageData(img, 0, 0);

  // Draw offscreen result to main canvas — prevents flickering
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.drawImage(offCanvas, 0, 0);
}

// Add random spots every few seconds
setInterval(() => {
  for (let i = 0; i < 40; i++) {
    const rx = Math.floor(Math.random() * simW);
    const ry = Math.floor(Math.random() * simH);
    B[rx + ry * simW] = 0.6 + Math.random() * 0.4;
  }
}, 2200);

function loop() {
  if (running) {
    stepSim();
    stepSim();
    renderSimToCanvas();
  }

  // Parallax — canvas is so oversized that no blank area can appear
  const offsetY = window.scrollY * 0.18;
  canvas.style.transform = `translateY(${offsetY}px)`;

  requestAnimationFrame(loop);
}

loop();

// Buttons
document.getElementById("pauseBtn").addEventListener("click", () => {
  running = !running;
  document.getElementById("pauseBtn").textContent = running
    ? "Pause"
    : "Resume";
});

document.getElementById("clearBtn").addEventListener("click", () => {
  seedSim();
});
