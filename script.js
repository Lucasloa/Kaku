/* reaction-diffusion.js
   Gray-Scott simulation, oversized canvas for scroll-safe background
*/

const canvas = document.getElementById('rd');
const ctx = canvas.getContext('2d');

let canvasW, canvasH;
let simW = 720; // medium-res simulation for smooth growth
let simH;

let A, B, A2, B2;
let running = true;

// Resize canvas and simulation arrays
function resizeAll() {
  canvasW = Math.round(window.innerWidth * 1.5);
  canvasH = Math.round(window.innerHeight * 1.5);
  canvas.width = canvasW;
  canvas.height = canvasH;

  const aspect = canvasW / canvasH;
  simW = Math.max(180, Math.min(600, 360)); // fixed medium resolution
  simH = Math.max(120, Math.round(simW / aspect));

  A = new Float32Array(simW * simH).fill(1.0);
  B = new Float32Array(simW * simH).fill(0.0);
  A2 = new Float32Array(simW * simH);
  B2 = new Float32Array(simW * simH);

  seedSim();
}

window.addEventListener('resize', resizeAll);
resizeAll();

// Seed with a central blob + a few random spots
function seedSim() {
  for (let i = 0; i < simW * simH; i++) {
    A[i] = 1.0;
    B[i] = 0.0;
  }

  const cx = Math.floor(simW / 2);
  const cy = Math.floor(simH / 2);

  for (let y = cy - 12; y <= cy + 12; y++) {
    for (let x = cx - 24; x <= cx + 24; x++) {
      if (x > 1 && x < simW - 2 && y > 1 && y < simH - 2) {
        const idx = x + y * simW;
        B[idx] = 0.6 + Math.random() * 0.4;
        A[idx] = 0.3 + Math.random() * 0.7;
      }
    }
  }

  // a few small random seeds
  for (let i = 0; i < 50; i++) {
    const rx = Math.floor(Math.random() * simW);
    const ry = Math.floor(Math.random() * simH);
    B[rx + ry * simW] = 0.5 * Math.random();
  }
}

// Laplacian convolution (5-point)
function laplace(arr, x, y) {
  const idx = x + y * simW;
  return (
    arr[idx] * -1 +
    arr[idx - 1] * 0.2 +
    arr[idx + 1] * 0.2 +
    arr[idx - simW] * 0.2 +
    arr[idx + simW] * 0.2
  );
}

// Gray-Scott step
function stepSim() {
  const dA = 1.0, dB = 0.5;
  const feed = 0.036, kill = 0.065;

  for (let y = 1; y < simH - 1; y++) {
    for (let x = 1; x < simW - 1; x++) {
      const i = x + y * simW;
      const a = A[i], b = B[i];
      const reaction = a * b * b;

      let aNext = a + (dA * laplace(A, x, y) - reaction + feed * (1 - a));
      let bNext = b + (dB * laplace(B, x, y) + reaction - (kill + feed) * b);

      A2[i] = Math.min(1, Math.max(0, aNext));
      B2[i] = Math.min(1, Math.max(0, bNext));
    }
  }

  // swap buffers
  [A, A2] = [A2, A];
  [B, B2] = [B2, B];
}

// Render to canvas with color mapping
function renderSimToCanvas() {
  const img = ctx.createImageData(canvasW, canvasH);
  const data = img.data;

  const sx = canvasW / simW;
  const sy = canvasH / simH;

  for (let y = 0; y < simH; y++) {
    for (let x = 0; x < simW; x++) {
      const i = x + y * simW;
      const diff = A[i] - B[i];

      // map to palette-like colors
      const v = Math.floor(Math.min(255, Math.max(0, diff * 128 + 128)));
      const r = Math.min(255, v + 30);
      const g = v;
      const b = Math.min(255, v + 15);

      const px = Math.floor(x * sx);
      const py = Math.floor(y * sy);
      const wBlock = Math.ceil(sx);
      const hBlock = Math.ceil(sy);

      for (let yy = 0; yy < hBlock; yy++) {
        const row = (py + yy) * canvasW * 4;
        for (let xx = 0; xx < wBlock; xx++) {
          const col = (px + xx) * 4;
          const pos = row + col;
          if (pos >= 0 && pos + 2 < data.length) {
            data[pos] = r;
            data[pos + 1] = g;
            data[pos + 2] = b;
            data[pos + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

// Occasionally add random spots for liveliness
setInterval(() => {
  for (let i = 0; i < 40; i++) {
    const rx = Math.floor(Math.random() * simW);
    const ry = Math.floor(Math.random() * simH);
    B[rx + ry * simW] = 0.6 + Math.random() * 0.4;
  }
}, 3000);

// Animation loop
function loop() {
  if (running) {
    // 3 steps per frame for smoother growth
    stepSim();
    stepSim();
    stepSim();
    renderSimToCanvas();
  }

  // oversized canvas parallax
  const offsetY = window.scrollY * 0.15;
  canvas.style.transform = `translateY(${offsetY}px)`;
  requestAnimationFrame(loop);
}

loop();

// Controls
document.getElementById('pauseBtn').addEventListener('click', () => {
  running = !running;
  document.getElementById('pauseBtn').textContent = running ? 'Pause' : 'Resume';
});

document.getElementById('clearBtn').addEventListener('click', () => {
  seedSim();
});

