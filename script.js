/* reaction-diffusion.js
   Fast version: low-res sim → offscreen canvas → scaled draw
*/

const canvas = document.getElementById('rd');
const ctx = canvas.getContext('2d');

// OFFSCREEN CANVAS for simulation rendering
const simCanvas = document.createElement('canvas');
const simCtx = simCanvas.getContext('2d');

let canvasW, canvasH;
let simW = 260;
let simH = 150;

let A, B, A2, B2;
let running = true;

function resizeAll() {
  canvasW = Math.round(window.innerWidth * 1.5);
  canvasH = Math.round(window.innerHeight * 1.5);
  canvas.width = canvasW;
  canvas.height = canvasH;

  simCanvas.width = simW;
  simCanvas.height = simH;

  A = new Float32Array(simW * simH).fill(1.0);
  B = new Float32Array(simW * simH).fill(0.0);
  A2 = new Float32Array(simW * simH);
  B2 = new Float32Array(simW * simH);

  seedSim();
}

window.addEventListener('resize', resizeAll);
resizeAll();

// seed restart
function seedSim() {
  for (let i = 0; i < simW * simH; i++) {
    A[i] = 1.0;
    B[i] = 0.0;
  }

  const cx = Math.floor(simW * 0.5);
  const cy = Math.floor(simH * 0.5);

  for (let y = cy - 6; y <= cy + 6; y++) {
    for (let x = cx - 12; x <= cx + 12; x++) {
      const idx = x + y * simW;
      B[idx] = 0.5 + Math.random() * 0.4;
      A[idx] = 0.3 + Math.random() * 0.6;
    }
  }
}

// Laplace
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

// Gray-Scott
function stepSim() {
  const dA = 1.0,
    dB = 0.5;
  const feed = 0.037,
    kill = 0.06;

  for (let y = 1; y < simH - 1; y++) {
    for (let x = 1; x < simW - 1; x++) {
      const i = x + y * simW;
      const a = A[i];
      const b = B[i];
      const reaction = a * b * b;

      let aN = a + (dA * laplace(A, x, y) - reaction + feed * (1 - a));
      let bN = b + (dB * laplace(B, x, y) + reaction - (kill + feed) * b);

      A2[i] = Math.min(1, Math.max(0, aN));
      B2[i] = Math.min(1, Math.max(0, bN));
    }
  }

  let t = A;
  A = A2;
  A2 = t;

  t = B;
  B = B2;
  B2 = t;
}

// fast render → small sim canvas → scaled
function renderSim() {
  const img = simCtx.createImageData(simW, simH);
  const d = img.data;

  for (let y = 0; y < simH; y++) {
    for (let x = 0; x < simW; x++) {
      const i = x + y * simW;
      const diff = A[i] - B[i];
      const v = (diff * 128) + 128;

      const r = Math.min(255, Math.max(0, v + 30));
      const g = Math.min(255, Math.max(0, v));
      const b = Math.min(255, Math.max(0, v + 15));

      const p = i * 4;
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
      d[p + 3] = 255;
    }
  }

  simCtx.putImageData(img, 0, 0);

  ctx.drawImage(simCanvas, 0, 0, canvasW, canvasH);
}

// keep it alive
setInterval(() => {
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(Math.random() * simW * simH);
    B[r] = 0.4 + Math.random() * 0.5;
  }
}, 1800);

// loop
function loop() {
  if (running) {
    stepSim();
    stepSim();
    renderSim();
  }

  const offsetY = window.scrollY * 0.15;
  canvas.style.transform = `translateY(${offsetY}px)`;

  requestAnimationFrame(loop);
}
loop();

// controls
document.getElementById('pauseBtn').addEventListener('click', () => {
  running = !running;
  document.getElementById('pauseBtn').textContent = running ? 'Pause' : 'Resume';
});
document.getElementById('clearBtn').addEventListener('click', seedSim);
