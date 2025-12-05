// ---- Reaction Diffusion WebGL Shader Background ----

const canvas = document.getElementById("rd");
const gl = canvas.getContext("webgl");

// Oversized canvas for scroll coverage
function resizeCanvas() {
    canvas.width = window.innerWidth * 1.5;
    canvas.height = window.innerHeight * 1.5;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Vertex shader
const vsSource = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment shader (animated color pattern)
const fsSource = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

vec3 palette(float t) {
    vec3 c1 = vec3(0.035, 0.035, 0.035); // #090909
    vec3 c2 = vec3(0.129, 0.078, 0.114); // #21141D
    vec3 c3 = vec3(0.180, 0.105, 0.082); // #2E1B15
    vec3 c4 = vec3(0.258, 0.184, 0.129); // #422F21
    vec3 c5 = vec3(0.337, 0.204, 0.169); // #56342B
    vec3 c6 = vec3(0.306, 0.082, 0.149); // #4E1526
    vec3 c7 = vec3(0.353, 0.157, 0.169); // #5A282B

    if (t < 0.16) return mix(c1, c2, t/0.16);
    if (t < 0.32) return mix(c2, c3, (t-0.16)/0.16);
    if (t < 0.48) return mix(c3, c4, (t-0.32)/0.16);
    if (t < 0.64) return mix(c4, c5, (t-0.48)/0.16);
    if (t < 0.80) return mix(c5, c6, (t-0.64)/0.16);
    return mix(c6, c7, (t-0.80)/0.20);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.08;
    float x = uv.x + sin(uv.y*3.0 + t) * 0.02;
    float y = uv.y + cos(uv.x*3.0 + t) * 0.02;
    float v = sin((x + y) * 8.0 + t) * 0.5 + 0.5;
    gl_FragColor = vec4(palette(v), 1.0);
}
`;

// Compile shader helper
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

// Create program
const program = gl.createProgram();
const vs = compileShader(gl.VERTEX_SHADER, vsSource);
const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// Quad covering screen
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
    gl.STATIC_DRAW
);

const posLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(program, "u_time");
const resLoc = gl.getUniformLocation(program, "u_resolution");

let running = true;

// Animation loop
function loop(time) {
    if (running) {
        gl.uniform1f(timeLoc, time * 0.001);
        gl.uniform2f(resLoc, canvas.width, canvas.height);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Soft parallax
    const offsetY = window.scrollY * 0.1;
    canvas.style.transform = `translateY(${offsetY}px)`;

    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Controls
document.getElementById("pauseBtn").addEventListener("click", () => {
    running = !running;
    document.getElementById("pauseBtn").textContent = running ? "Pause" : "Resume";
});
document.getElementById("clearBtn").addEventListener("click", () => {
    // No clear for shader animation, could reset time if needed
});
