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
  h = canvas.height = window.innerHeight; // always viewport
  A = new Float32Array(w * h).fill(1);
  B = new Float32Array(w * h).fill(0);

  // Initial random B spots
  addRandomBSpots(500);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Add random B spots for evolution
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

// Update reaction-diffusion
function updateRD() {
  const feed = 0.034, kill = 0.062, Da = 1, Db = 0.5;
  const newA = new Float32Array(w * h);
  const newB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const a = A[i], b = B[i];

      // Gray-Scott Reaction-Diffusion equations
      const aNext = a + (Da * lap(A, x, y) - a * b * b + feed * (1 - a));
      const bNext = b + (Db * lap(B, x, y) + a * b * b - (kill + feed) * b);

      // Clamp values to [0,1]
      newA[i] = Math.min(Math.max(aNext, 0), 1);
      newB[i] = Math.min(Math.max(bNext, 0), 1);
    }
  }

  A = newA;
  B = newB;
}

// Draw reaction-diffusion
function drawRD() {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  for (let i = 0; i < A.length; i++) {
    const diff = A[i] - B[i];
    // Map to safe mid-range color to reduce flicker
    const v = Math.floor((diff * 100) + 128); // softer scaling
    const idx = i * 4;
    data[idx] = Math.max(0, Math.min(255, v + 20));   // Red
    data[idx + 1] = Math.max(0, Math.min(255, v));    // Green
    data[idx + 2] = Math.max(0, Math.min(255, v + 10)); // Blue
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Add B spots every few seconds
setInterval(() => addRandomBSpots(50), 2500);

// Main animation loop
function animate() {
  if (running) {
    updateRD();
    drawRD();
  }
  // Soft parallax scroll
  canvas.style.transform = `translateY(${window.scrollY * 0.2}px)`;
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
  addRandomBSpots(500);
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
