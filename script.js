// reaction-diffusion-webgl.js
// WebGL shader background with robust checks, DPR scaling, resize handling,
// and a tiny 2D fallback if WebGL isn't available or shaders fail.

const canvas = document.getElementById("rd");

// Utility: resize canvas for DPR
function resizeCanvasToDisplaySize(c) {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(window.innerWidth * dpr));
  const displayHeight = Math.max(1, Math.floor(window.innerHeight * dpr));
  if (c.width !== displayWidth || c.height !== displayHeight) {
    c.width = displayWidth;
    c.height = displayHeight;
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
    return true;
  }
  return false;
}

// Try WebGL first
let gl = null;
try {
  gl = canvas.getContext("webgl", { antialias: true });
} catch (e) {
  gl = null;
}

let useWebGL = !!gl;

if (!useWebGL) {
  // Fallback: very small CPU animation so user sees something
  console.warn("WebGL not available — using 2D fallback.");
  const ctx2 = canvas.getContext("2d");
  let t0 = 0;
  function fallbackFrame(t) {
    resizeCanvasToDisplaySize(canvas);
    const w = canvas.width, h = canvas.height;
    const img = ctx2.createImageData(w, h);
    const data = img.data;
    const time = t * 0.001;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const v = Math.floor((Math.sin((x*0.01) + time) + Math.cos((y*0.01) + time*0.7))*32 + 128);
        data[i] = Math.max(0, Math.min(255, v + 20));
        data[i+1] = Math.max(0, Math.min(255, v));
        data[i+2] = Math.max(0, Math.min(255, v + 40));
        data[i+3] = 255;
      }
    }
    ctx2.putImageData(img, 0, 0);
    requestAnimationFrame(fallbackFrame);
  }
  requestAnimationFrame(fallbackFrame);
} else {
  // ---- WebGL path ----

  // Vertex shader (pass-through)
  const vsSource = `
attribute vec2 p;
void main(){
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

  // Fragment shader — visual (not full Gray-Scott simulation, but smooth, GPU-safe procedural)
  const fsSource = `
precision mediump float;
uniform float time;
uniform vec2 resolution;

// palette interpolation (brown/purple-ish)
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

float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }

// Simple reaction-looking procedural — very stable and GPU-friendly
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * vec2(resolution.x/resolution.y, 1.0);

  float t = time * 0.12;

  // layered sin+noise patterns to get organic reaction-like movement
  float r = 0.0;
  r += sin((p.x + t) * 6.0) * 0.5 + 0.5;
  r *= mix(0.7, 1.2, sin((p.y*3.0 - t)*0.8)*0.5+0.5);
  r += 0.2 * sin((p.x*2.0 + p.y*3.0) * 3.0 + t*1.2);
  r += 0.12 * hash21(p + t*0.1);
  r = clamp(r, 0.0, 1.0);

  // small evolving blobs
  float blobs = 0.0;
  blobs += smoothstep(0.45, 0.6, 0.5 + 0.5*sin((p.x*8.0 + t*1.3)));
  blobs += smoothstep(0.3, 0.55, 0.4 + 0.6*cos((p.y*6.0 - t*0.9)));
  blobs = clamp(blobs, 0.0, 1.0);

  float v = mix(r, blobs, 0.45);

  vec3 col = palette(v);
  // gentle vignette for readability
  float vign = smoothstep(1.05, 0.4, length(uv - 0.5) * 1.4);
  col *= mix(0.85, 1.0, vign);

  gl_FragColor = vec4(col, 1.0);
}
`;

  function compileShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    const ok = gl.getShaderParameter(s, gl.COMPILE_STATUS);
    if (!ok) {
      const log = gl.getShaderInfoLog(s);
      console.error("Shader compile error:", log);
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
    if (!ok) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  const program = createProgram(gl, vsSource, fsSource);
  if (!program) {
    console.error("WebGL program creation failed — falling back to 2D.");
    useWebGL = false;
    // start fallback 2D if desired
    const ctx2 = canvas.getContext("2d");
    let t0 = 0;
    function fallbackFrame(t) {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width, h = canvas.height;
      const img = ctx2.createImageData(w, h);
      const data = img.data;
      const time = t * 0.001;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const v = Math.floor((Math.sin((x*0.01) + time) + Math.cos((y*0.01) + time*0.7))*32 + 128);
          data[i] = Math.max(0, Math.min(255, v + 20));
          data[i+1] = Math.max(0, Math.min(255, v));
          data[i+2] = Math.max(0, Math.min(255, v + 40));
          data[i+3] = 255;
        }
      }
      ctx2.putImageData(img, 0, 0);
      requestAnimationFrame(fallbackFrame);
    }
    requestAnimationFrame(fallbackFrame);
    return;
  }

  gl.useProgram(program);

  // Setup vertex buffer
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
    gl.STATIC_DRAW
  );

  const pLoc = gl.getAttribLocation(program, "p");
  if (pLoc >= 0) {
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
  }

  const timeLoc = gl.getUniformLocation(program, "time");
  const resLoc = gl.getUniformLocation(program, "resolution");

  // initial viewport & DPR-aware resize
  function onResize() {
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  onResize();
  window.addEventListener("resize", onResize);

  // render loop
  function draw(t) {
    if (!useWebGL) return;
    // ensure canvas pixel size matches DPR
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const seconds = t * 0.001;
    gl.uniform1f(timeLoc, seconds);
    gl.uniform2f(resLoc, canvas.width, canvas.height);

    // clear then draw
    gl.clearColor(0.03, 0.03, 0.03, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
