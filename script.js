/* -----------------------------
   Reaction Diffusion Background
------------------------------ */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let w = canvas.width;
let h = canvas.height;

// Gray–Scott buffers
let A, B;

function init() {
  w = canvas.width;
  h = canvas.height;

  A = new Float32Array(w * h);
  B = new Float32Array(w * h);

  // initialize A = 1 everywhere
  for (let i = 0; i < A.length; i++) A[i] = 1;

  // drop small random spots of B
  for (let i = 0; i < 500; i++) {
    let x = Math.floor(Math.random() * w);
    let y = Math.floor(Math.random() * h);
    let idx = x + y * w;
    B[idx] = 1;
  }
}

function lap(arr, x, y) {
  let idx = x + y * w;

  let sum =
    arr[idx] * -1 +
    arr[idx - 1] * 0.2 +
    arr[idx + 1] * 0.2 +
    arr[idx - w] * 0.2 +
    arr[idx + w] * 0.2;

  return sum;
}

function updateRD() {
  let feed = 0.034;
  let kill = 0.062;
  let Da = 1;
  let Db = 0.5;

  const newA = new Float32Array(w * h);
  const newB = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let i = x + y * w;

      let a = A[i];
      let b = B[i];

      newA[i] = a + (Da * lap(A, x, y) - a * b * b + feed * (1 - a)) * 1.2;
      newB[i] = b + (Db * lap(B, x, y) + a * b * b - (kill + feed) * b) * 1.2;

      newA[i] = Math.max(0, Math.min(1, newA[i]));
      newB[i] = Math.max(0, Math.min(1, newB[i]));
    }
  }

  A = newA;
  B = newB;
}

function drawRD() {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  for (let i = 0; i < A.length; i++) {
    let v = Math.floor((A[i] - B[i]) * 255);

    let idx = i * 4;
    data[idx] = v + 50;       
    data[idx + 1] = v;      
    data[idx + 2] = v + 30;  
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

let running = true;

function animate() {
  if (running) {
    updateRD();
    drawRD();
  }
  requestAnimationFrame(animate);
}

document.getElementById("pauseBtn").onclick = () => {
  running = !running;
  document.getElementById("pauseBtn").innerText = running ? "Pause" : "Resume";
};

document.getElementById("clearBtn").onclick = () => {
  init();
};

init();
animate();

/* -----------------------------
   Reveal-on-scroll Animations
------------------------------ */

const revealElements = document.querySelectorAll(".section, .card, .videos iframe");

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

revealElements.forEach(el => observer.observe(el));

/* -----------------------------
   Soft Parallax
------------------------------ */
window.addEventListener("scroll", () => {
  let offset = window.scrollY * 0.2;
  canvas.style.transform = `translateY(${offset}px)`;
});
