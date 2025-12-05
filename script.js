/* -----------------------------
   Reaction Diffusion Background
------------------------------ */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

let w, h;
let A, B;
let running = true;

// Resize + init
function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;

  A = new Float32Array(w * h).fill(1);
  B = new Float32Array(w * h).fill(0);

  addRandomBSpots(600);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Random seeds
function addRandomBSpots(count = 50) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    B[x + y * w] = 1;
  }
}

// Laplacian
function lap(arr, x, y) {
  const i = x + y * w;
  return (
    arr[i] * -1 +
    arr[i - 1] * 0.2 +
    arr[i + 1] * 0.2 +
    arr[i - w] * 0.2 +
    arr[i + w] * 0.2
  );
}

// RD update
function updateRD() {
  const feed = 0.034,
        kill = 0.062,
        Da = 1,
        Db = 0.5;

  const nextA = new Float32Array(w * h);
  const nextB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const a = A[i], b = B[i];

      const aN = a + (Da * lap(A, x, y) - a * b * b + feed * (1 - a));
      const bN = b + (Db * lap(B, x, y) + a * b * b - (kill + feed) * b);

      nextA[i] = Math.min(Math.max(aN, 0), 1);
      nextB[i] = Math.min(Math.max(bN, 0), 1);
    }
  }

  A = nextA;
  B = nextB;
}

// Draw RD + smoothing
function drawRD() {
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let i = 0; i < A.length; i++) {
    const diff = A[i] - B[i];
    const v = Math.floor(diff * 105 + 128);

    const idx = i * 4;
    d[idx] = v + 20;
    d[idx + 1] = v;
    d[idx + 2] = v + 10;
    d[idx + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);

  // ★★★ Added smoothing filter (anti-aliasing)
  ctx.filter = "blur(2px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
}

setInterval(() => addRandomBSpots(40), 3000);

// Animate
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
   Controls
------------------------------ */
document.getElementById("pauseBtn").onclick = () => {
  running = !running;
  document.getElementById("pauseBtn").innerText = running ? "Pause" : "Resume";
};

document.getElementById("clearBtn").onclick = () => {
  addRandomBSpots(400);
};

/* -----------------------------
   Work / Content Scroll
------------------------------ */
document.getElementById("btnContent").onclick = () =>
  contentSection.scrollIntoView({ behavior: "smooth" });

document.getElementById("btnWork").onclick = () =>
  workSection.scrollIntoView({ behavior: "smooth" });
