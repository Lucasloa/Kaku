/* -----------------------------
   Reaction Diffusion Background
------------------------------ */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

let w, h;
let A, B;
let running = true;

// Initialize canvas and buffers
function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  A = new Float32Array(w * h).fill(1);
  B = new Float32Array(w * h).fill(0);

  // Large initial patches for pattern growth
  addRandomBSpots(3000, 20);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Add B spots for evolution
function addRandomBSpots(count = 50, size = 4) {
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(Math.random() * w);
    const cy = Math.floor(Math.random() * h);

    for (let dx = -size; dx <= size; dx++) {
      for (let dy = -size; dy <= size; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x > 1 && y > 1 && x < w - 1 && y < h - 1) {
          B[x + y * w] = 1;
        }
      }
    }
  }
}

// Laplacian function (stronger diffusion → bigger patterns)
function lap(arr, x, y) {
  const idx = x + y * w;
  return (
    arr[idx] * -1 +
    arr[idx - 1] * 0.25 +
    arr[idx + 1] * 0.25 +
    arr[idx - w] * 0.25 +
    arr[idx + w] * 0.25
  );
}

// Update reaction-diffusion
function updateRD() {
  // **The magic numbers**
  const feed = 0.0275;   // lower feed = slower, smoother, larger patterns
  const kill = 0.062;    // tuned to form long worm-like structures
  const Da = 1.0;
  const Db = 0.5;

  const newA = new Float32Array(w * h);
  const newB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const a = A[i];
      const b = B[i];

      const aNext = a + (Da * lap(A, x, y) - a * b * b + feed * (1 - a));
      const bNext = b + (Db * lap(B, x, y) + a * b * b - (kill + feed) * b);

      newA[i] = Math.min(Math.max(aNext, 0), 1);
      newB[i] = Math.min(Math.max(bNext, 0), 1);
    }
  }

  A = newA;
  B = newB;
}

// Draw reaction-diffusion
function drawRD() {
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let i = 0; i < A.length; i++) {
    const v = Math.floor((A[i] - B[i]) * 180 + 128); // stronger contrast
    const idx = i * 4;
    d[idx] = v + 20;
    d[idx + 1] = v - 10;
    d[idx + 2] = v + 5;
    d[idx + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
}

// Periodically seed new B
setInterval(() => addRandomBSpots(50, 6), 2000);

// Main loop
function animate() {
  if (running) {
    updateRD();
    drawRD();
  }
  canvas.style.transform = `translateY(${window.scrollY * 0.15}px)`;
  requestAnimationFrame(animate);
}
animate();

/* -----------------------------
   Controls
------------------------------ */
document.getElementById("pauseBtn").onclick = () => {
  running = !running;
  document.getElementById("pauseBtn").innerText = running ? "Pause" : "Resume";
};

document.getElementById("clearBtn").onclick = () => {
  addRandomBSpots(3000, 20);
};

/* -----------------------------
   Work / Content Scroll
------------------------------ */
const btnContent = document.getElementById("btnContent");
const btnWork = document.getElementById("btnWork");
const workSection = document.getElementById("workSection");
const contentSection = document.getElementById("contentSection");

btnContent.addEventListener("click", () => {
  contentSection.scrollIntoView({ behavior: "smooth" });
});

btnWork.addEventListener("click", () => {
  workSection.scrollIntoView({ behavior: "smooth" });
});
