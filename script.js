// ---- Reaction-Diffusion Gray-Scott ----
const canvas = document.getElementById('rd');
const ctx = canvas.getContext('2d');

let canvasW, canvasH;
let simW = 240;
let simH = 140;

let A, B, A2, B2;
let running = true;

// Resize canvas and simulation arrays
function resizeAll() {
  canvasW = Math.round(window.innerWidth * 1.5);
  canvasH = Math.round(window.innerHeight * 1.5);
  canvas.width = canvasW;
  canvas.height = canvasH;

  const aspect = canvasW / canvasH;
  simW = Math.max(120, Math.min(400, Math.round(240 * aspect)));
  simH = Math.max(80, Math.round(simW / aspect));

  A = new Float32Array(simW * simH).fill(1.0);
  B = new Float32Array(simW * simH).fill(0.0);
  A2 = new Float32Array(simW * simH);
  B2 = new Float32Array(simW * simH);

  seedSim();
}

window.addEventListener('resize', resizeAll);
resizeAll();

// Seed simulation
function seedSim() {
  for (let i = 0; i < simW * simH; i++) {
    A[i] = 1.0;
    B[i] = 0.0;
  }

  const cx = Math.floor(simW * 0.5);
  const cy = Math.floor(simH * 0.5);

  for (let y = cy - 6; y <= cy + 6; y++) {
    for (let x = cx - 12; x <= cx + 12; x++) {
      if (x > 1 && x < simW-2 && y > 1 && y < simH-2) {
        const idx = x + y * simW;
        B[idx] = 0.6 + Math.random()*0.4;
        A[idx] = 0.3 + Math.random()*0.7;
      }
    }
  }

  for (let i=0; i<60; i++) {
    const rx = Math.floor(Math.random()*simW);
    const ry = Math.floor(Math.random()*simH);
    B[rx + ry * simW] = 0.7 * Math.random();
  }
}

// Laplacian kernel
function laplace(arr, x, y) {
  const idx = x + y * simW;
  return (
    arr[idx]*-1 +
    arr[idx-1]*0.2 +
    arr[idx+1]*0.2 +
    arr[idx-simW]*0.2 +
    arr[idx+simW]*0.2
  );
}

// Step simulation
function stepSim() {
  const dA = 1.0, dB = 0.5;
  const feed = 0.037, kill = 0.06;

  for (let y=1; y<simH-1; y++) {
    for (let x=1; x<simW-1; x++) {
      const i = x + y*simW;
      const a = A[i], b = B[i];
      const reaction = a*b*b;
      A2[i] = Math.min(1, Math.max(0, a + (dA*laplace(A,x,y)-reaction + feed*(1-a))));
      B2[i] = Math.min(1, Math.max(0, b + (dB*laplace(B,x,y)+reaction-(kill+feed)*b)));
    }
  }

  [A,A2] = [A2,A];
  [B,B2] = [B2,B];
}

// Render simulation
function renderSim() {
  const img = ctx.createImageData(canvasW, canvasH);
  const data = img.data;

  const sx = canvasW / simW;
  const sy = canvasH / simH;

  for (let sy_i=0; sy_i<simH; sy_i++) {
    for (let sx_i=0; sx_i<simW; sx_i++) {
      const i = sx_i + sy_i*simW;
      const diff = A[i]-B[i];
      const v = Math.floor(Math.min(255, Math.max(0, (diff*128)+128)));

      const r = Math.min(255, v+30);
      const g = v;
      const b = Math.min(255, v+15);

      const px = Math.floor(sx_i*sx);
      const py = Math.floor(sy_i*sy);
      const wBlock = Math.ceil(sx);
      const hBlock = Math.ceil(sy);

      for (let yy=0; yy<hBlock; yy++) {
        const row = (py+yy)*canvasW*4;
        for (let xx=0; xx<wBlock; xx++) {
          const col = (px+xx)*4;
          const pos = row + col;
          if(pos+2 < data.length){
            data[pos] = r;
            data[pos+1] = g;
            data[pos+2] = b;
            data[pos+3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(img,0,0);
}

// Randomly inject spots for motion
setInterval(() => {
  for (let i=0; i<40; i++){
    const rx = Math.floor(Math.random()*simW);
    const ry = Math.floor(Math.random()*simH);
    B[rx + ry*simW] = 0.6 + Math.random()*0.4;
  }
}, 2200);

// Main loop
function loop(){
  if(running){
    stepSim();
    stepSim();
    renderSim();
  }

  const offsetY = window.scrollY * 0.18; // soft parallax
  canvas.style.transform = `translateY(${offsetY}px)`;
  requestAnimationFrame(loop);
}

loop();

// Controls
document.getElementById('pauseBtn').addEventListener('click', ()=>{
  running = !running;
  document.getElementById('pauseBtn').textContent = running ? 'Pause' : 'Resume';
});
document.getElementById('clearBtn').addEventListener('click', ()=>{ seedSim(); });
