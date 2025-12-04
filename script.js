// ---- Reaction Diffusion WebGL Shader Background ----

const canvas = document.getElementById("rd");
const gl = canvas.getContext("webgl");

canvas.width = innerWidth;
canvas.height = innerHeight;

// Vertex shader
const vs = `
attribute vec2 p;
void main(){
    gl_Position = vec4(p, 0.0, 1.0);
}
`;

// Fragment shader (Gray-Scott simulation)
const fs = `
precision highp float;
uniform float time;
uniform vec2 resolution;

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

void main(){
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    float t = time * 0.08;
    float x = uv.x + sin(uv.y*3.0 + t) * 0.02;
    float y = uv.y + cos(uv.x*3.0 + t) * 0.02;

    float v = sin((x + y) * 8.0 + t) * 0.5 + 0.5;

    gl_FragColor = vec4(palette(v), 1.0);
}
`;

function createShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(program);
gl.useProgram(program);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

const pLoc = gl.getAttribLocation(program, "p");
gl.enableVertexAttribArray(pLoc);
gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(program, "time");
const resLoc = gl.getUniformLocation(program, "resolution");

function loop(t){
    gl.uniform1f(timeLoc, t * 0.001);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
}
loop();

// Handle resizing
addEventListener("resize", () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});
