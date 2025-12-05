/* ---------------------------------------------------------
   Reaction Diffusion – Stable, Oversized, Smooth Version
   --------------------------------------------------------- */

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let width, height;
let imageData, pixels;

function resize() {
    width = canvas.width = window.innerWidth * 1.6;   // Oversized horizontally
    height = canvas.height = window.innerHeight * 1.6; // Oversized vertically

    imageData = ctx.createImageData(width, height);
    pixels = imageData.data;

    initPattern();
}

window.addEventListener("resize", resize);
resize();

/* ---------------------------------------------------------
   COLOR PALETTE (your old brown/purple palette)
   --------------------------------------------------------- */

function palette(value) {
    const r = 70 + value * 120;  // deep red–brown tones
    const g = 40 + value * 70;   // warm brown mids
    const b = 70 + value * 100;  // purple–brown shadows
    return [r, g, b];
}

/* ---------------------------------------------------------
   Init pattern
   --------------------------------------------------------- */

function initPattern() {
    for (let i = 0; i < width * height * 4; i += 4) {
        let v = Math.random();
        let [r, g, b] = palette(v);

        pixels[i]   = r;
        pixels[i+1] = g;
        pixels[i+2] = b;
        pixels[i+3] = 255;
    }
}

/* ---------------------------------------------------------
   Lightweight diffusion blur (fast + stable)
   --------------------------------------------------------- */

function diffuse() {
    let w = width * 4;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let i = y * w + x * 4;

            let sum =
                pixels[i - 4] + pixels[i + 4] + // left / right
                pixels[i - w] + pixels[i + w]; // up / down

            let avg = sum * 0.25;

            pixels[i] = pixels[i] * 0.92 + avg * 0.08;
            pixels[i + 1] = pixels[i + 1] * 0.92 + avg * 0.08;
            pixels[i + 2] = pixels[i + 2] * 0.92 + avg * 0.08;
        }
    }
}

/* ---------------------------------------------------------
   Animation Loop (smooth, stable)
   --------------------------------------------------------- */

let running = true;

function loop() {
    if (running) {
        diffuse();
        ctx.putImageData(imageData, 0, 0);
    }
    requestAnimationFrame(loop);
}

loop();

/* ---------------------------------------------------------
   Controls (Pause/Resume buttons in footer)
   --------------------------------------------------------- */
document.getElementById("pauseBtn").onclick = () => running = false;
document.getElementById("resumeBtn").onclick = () => running = true;
