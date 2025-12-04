// Reaction–Diffusion Background (Gray-Scott)

const canvas = document.getElementById("rd");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

let w = canvas.width;
let h = canvas.height;

let A = [], B = [];
let dA = 1.0, dB = 0.5;
let feed = 0.037;
let kill = 0.06;

// Color palette (your colors)
const palette = [
    "#090909", "#21141D", "#2E1B15",
    "#422F21", "#56342B", "#4E1526", "#5A282B"
];

function init() {
    for (let x = 0; x < w; x++) {
        A[x] = [];
        B[x] = [];
        for (let y = 0; y < h; y++) {
            A[x][y] = 1;
            B[x][y] = 0;
        }
    }

    // Seed area in center
    for (let x = w/2 - 20; x < w/2 + 20; x++) {
        for (let y = h/2 - 20; y < h/2 + 20; y++) {
            B[x][y] = 1;
        }
    }
}

function lap(arr, x, y) {
    return (
        arr[x][y] * -1 +
        arr[x - 1]?.[y] * 0.2 +
        arr[x + 1]?.[y] * 0.2 +
        arr[x]?.[y - 1] * 0.2 +
        arr[x]?.[y + 1] * 0.2
    );
}

function update() {
    let nextA = [];
    let nextB = [];

    for (let x = 1; x < w - 1; x++) {
        nextA[x] = [];
        nextB[x] = [];
        for (let y = 1; y < h - 1; y++) {
            let a = A[x][y];
            let b = B[x][y];

            let reaction = a * b * b;

            nextA[x][y] = a + (dA * lap(A, x, y) - reaction + feed * (1 - a));
            nextB[x][y] = b + (dB * lap(B, x, y) + reaction - (kill + feed) * b);

            nextA[x][y] = Math.min(Math.max(nextA[x][y], 0), 1);
            nextB[x][y] = Math.min(Math.max(nextB[x][y], 0), 1);
        }
    }

    A = nextA;
    B = nextB;
}

function draw() {
    let img = ctx.createImageData(w, h);

    for (let i = 0; i < img.data.length; i += 4) {
        let x = (i / 4) % w;
        let y = Math.floor(i / 4 / w);

        let val = B[x]?.[y] || 0; // intensity

        // Map intensity (0 → 6) to palette
        let idx = Math.floor(val * (palette.length - 1));
        idx = Math.max(0, Math.min(idx, palette.length - 1));

        let c = palette[idx];

        let r = parseInt(c.substring(1, 3), 16);
        let g = parseInt(c.substring(3, 5), 16);
        let b = parseInt(c.substring(5, 7), 16);

        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
}

function loop() {
    for (let i = 0; i < 8; i++) update();
    draw();
    requestAnimationFrame(loop);
}

init();
loop();

// Resize listener
window.addEventListener("resize", () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    w = canvas.width;
    h = canvas.height;
    init();
});
