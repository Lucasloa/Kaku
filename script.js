/* -----------------------------
   Reaction Diffusion Background
------------------------------ */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

let w, h;
let A, B;
let running = true;

// Resize canvas and initialize buffers
function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = Math.max(window.innerHeight, document.body.scrollHeight);

  A = new Float32Array(w * h).fill(1);
  B = new Float32Array(w * h).fill(0);

  addRandomBSpots(500);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Add random B spots continuously
function addRandomBSpots(count = 50) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    B[x + y * w] = 1;
  }
}

// Laplacian function for diffusion
function lap(arr, x, y) {
  const idx = x + y * w;
  return arr[idx] * -1 + arr[idx - 1] * 0.2 + arr[idx + 1] * 0.2 + arr[idx - w] * 0.2 + arr[idx + w] * 0.2;
}

// Update reaction-diffusion simulation
function updateRD() {
  const feed = 0.034, kill = 0.062, Da = 1, Db = 0.5;
  const newA = new Float32Array(w * h);
  const newB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const a = A[i], b = B[i];

      newA[i] = Math.max(0, Math.min(1, a + (Da * lap(A, x, y) - a * b * b + feed * (1 - a)) * 1.2));
      newB[i] = Math.max(0, Math.min(1, b + (Db * lap(B, x, y) + a * b * b - (kill + feed) * b) * 1.2));
    }
  }

  A = newA;
  B = newB;
}

// Draw reaction-diffusion onto canvas with safe mid-range colors
function drawRD() {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  for (let i = 0; i < A.length; i++) {
    const diff = A[i] - B[i];
    // Map to mid-range 0–255 with gentle scaling
    const v = Math.floor(Math.min(255, Math.max(0, (diff * 128) + 128)));
    const idx = i * 4;
    data[idx] = v + 30;       // Red
    data[idx + 1] = v;        // Green
    data[idx + 2] = v + 15;   // Blue
    data[idx + 3] = 255;      // Alpha
  }

  ctx.putImageData(imageData, 0, 0);
}

// Add random B spots every 2.5s for continuous looping
setInterval(() => addRandomBSpots(50), 2500);

// Animation loop with soft parallax scroll
function animate() {
  if (running) {
    updateRD();
    drawRD();
  }
  canvas.style.transform = `translateY(${window.scrollY * 0.2}px)`;
  requestAnimationFrame(animate);
}
animate();

/* -----------------------------
   Controls: Pause & Clear
------------------------------ */
document.getElementById("pauseBtn").onclick = () => {
  running = !running;
  document.getElementById("pauseBtn").innerText = running ? "Pause" : "Resume";
};

document.getElementById("clearBtn").onclick = () => {
  addRandomBSpots(500);
};

/* -----------------------------
   Work / Content Smooth Scroll
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
