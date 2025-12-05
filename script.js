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

  seedCircularBlobs(14, 18); // smooth circular blobs
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* -----------------------------
   Circular seeding
------------------------------ */

function seedCircularBlobs(num = 12, size = 20) {
  for (let n = 0; n < num; n++) {
    const cx = Math.floor(Math.random() * w);
    const cy = Math.floor(Math.random() * h);

    for (let dx = -size; dx <= size; dx++) {
      for (let dy = -size; dy <= size; dy++) {
        if (dx * dx + dy * dy <= size * size) { // circle mask
          const x = cx + dx;
          const y = cy + dy;
          if (x > 1 && y > 1 && x < w - 1 && y < h - 1) {
            B[x + y * w] = 1;
          }
        }
      }
    }
  }
}

// Add small circular spots during evolution
function addRandomBSpots(count = 50) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const idx = x + y * w;
    B[idx] = 1;
  }
}

/* -----------------------------
   Laplacian
------------------------------ */

function lap(arr, x, y) {
  const idx = x + y * w;
  return (
    arr[idx] * -1 +
    arr[idx - 1] * 0.2 +
    arr[idx + 1] * 0.2 +
    arr[idx - w] * 0.2 +
    arr[idx + w] * 0.2
  );
}

/* -----------------------------
   Reaction-Diffusion Update
------------------------------ */

function updateRD() {
  const feed = 0.034, kill = 0.062, Da = 1, Db = 0.5;
  const newA = new Float32Array(w * h);
  const newB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const a = A[i], b = B[i];

      // Gray-Scott equations
      const reaction = a * b * b;

      const aNext = a + (Da * lap(A, x, y) - reaction + feed * (1 - a));
      const bNext = b + (Db * lap(B, x, y) + reaction - (kill + feed) * b);

      newA[i] = Math.min(Math.max(aNext, 0), 1);
      newB[i] = Math.min(Math.max(bNext, 0), 1);
    }
  }

  A = newA;
  B = newB;
}

/* -----------------------------
   Render to Canvas
------------------------------ */

function drawRD() {
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let i = 0; i < A.length; i++) {
    const diff = A[i] - B[i];

    // softer color mapping to avoid flicker
    const v = Math.floor(diff * 100 + 128);

    const idx = i * 4;
    data[idx] = Math.max(0, Math.min(255, v + 20)); // R
    data[idx + 1] = Math.max(0, Math.min(255, v));   // G
    data[idx + 2] = Math.max(0, Math.min(255, v + 10)); // B
    data[idx + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
}

/* -----------------------------
   Extra B spots over time
------------------------------ */
setInterval(() => addRandomBSpots(30), 2200);

/* -----------------------------
   Animation Loop
------------------------------ */

function animate() {
  if (running) {
    updateRD();
    drawRD();
  }

  // Parallax movement
  canvas.style.transform = `translateY(${window.scrollY * 0.2}px)`;

  requestAnimationFrame(animate);
}
animate();

/* -----------------------------
   Controls
------------------------------ */

document.getElementById("pauseBtn").onclick = () => {
  running = !running;
  document.getElementById("pauseBtn").innerText =
    running ? "Pause" : "Resume";
};

document.getElementById("clearBtn").onclick = () => {
  seedCircularBlobs(14, 18);
};

/* -----------------------------
   Navigation buttons
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
