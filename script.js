// reaction-diffusion WebGL background + simple interactivity
// Written to be self-contained. Click/drag on canvas to "paint" disturbances.
// Buttons: Pause / Clear

(() => {
  const canvas = document.getElementById('rd-canvas');
  const gl = canvas.getContext('webgl2', {antialias: false});
  if (!gl) {
    console.warn('WebGL2 not supported — falling back to static background.');
    return;
  }

  // --- utilities ---
  const vsSource = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main(){
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  // fragment for reaction-diffusion (Gray-Scott)
  const fsSim = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  uniform sampler2D u_prev;
  uniform vec2 u_px; // 1/size
  uniform float dA;
  uniform float dB;
  uniform float feed;
  uniform float kill;
  uniform vec2 u_mouse; // -1 if none else uv
  uniform float u_time;
  out vec4 outColor;

  // Laplacian kernel
  vec2 laplace(vec2 uv){
    vec2 sum = vec2(0.0);
    // sample center
    vec2 c = texture(u_prev, uv).xy;
    // neighbors
    sum += texture(u_prev, uv + vec2(-u_px.x,0)).xy * 0.2;
    sum += texture(u_prev, uv + vec2(u_px.x,0)).xy * 0.2;
    sum += texture(u_prev, uv + vec2(0,-u_px.y)).xy * 0.2;
    sum += texture(u_prev, uv + vec2(0,u_px.y)).xy * 0.2;
    sum += texture(u_prev, uv + vec2(-u_px.x,-u_px.y)).xy * 0.05;
    sum += texture(u_prev, uv + vec2(u_px.x,-u_px.y)).xy * 0.05;
    sum += texture(u_prev, uv + vec2(-u_px.x,u_px.y)).xy * 0.05;
    sum += texture(u_prev, uv + vec2(u_px.x,u_px.y)).xy * 0.05;
    sum += c * -1.0;
    return sum;
  }

  void main(){
    vec2 state = texture(u_prev, v_uv).xy;
    float A = state.x;
    float B = state.y;

    vec2 L = laplace(v_uv);
    float lapA = L.x;
    float lapB = L.y;

    float reaction = A * B * B;
    float dA_dt = dA * lapA - reaction + feed * (1.0 - A);
    float dB_dt = dB * lapB + reaction - (kill + feed) * B;

    A += dA_dt * 1.0;
    B += dB_dt * 1.0;

    // mouse splat
    if (u_mouse.x >= 0.0) {
      float dx = (v_uv.x - u_mouse.x);
      float dy = (v_uv.y - u_mouse.y);
      float r = sqrt(dx*dx + dy*dy);
      float influence = exp(-r*160.0);
      B += 0.6 * influence;
      A -= 0.3 * influence;
    }

    A = clamp(A, 0.0, 1.0);
    B = clamp(B, 0.0, 1.0);
    outColor = vec4(A, B, 0.0, 1.0);
  }`;

  // final pass: colorize the B channel into a palette gradient
  const fsDisplay = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  uniform sampler2D u_tex;
  out vec4 outColor;

  // palette colors (taken from user's palette)
  vec3 c0 = vec3(0.306, 0.078, 0.149); // #4E1526
  vec3 c1 = vec3(0.352, 0.157, 0.169); // #5A282B
  vec3 c2 = vec3(0.333, 0.204, 0.169); // #56342B

  void main(){
    float B = texture(u_tex, v_uv).y;
    // remap B for nicer contrast
    float t = smoothstep(0.05, 0.8, B);
    vec3 color = mix(c0, c1, t);
    color = mix(color, c2, t * t);
    // subtle vignette
    float dist = distance(v_uv, vec2(0.5));
    color *= 1.0 - smoothstep(0.6, 1.0, dist) * 0.6;
    outColor = vec4(color, 1.0);
  }`;

  // create programs
  function compileShader(src, type){
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      console.error(src);
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function linkProgram(vsSrc, fsSrc){
    const vs = compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a_pos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  const simProg = linkProgram(vsSource, fsSim);
  const displayProg = linkProgram(vsSource, fsDisplay);

  // fullscreen quad
  const quadVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  const quadVerts = new Float32Array([
    -1,-1,  1,-1,  -1,1,
     -1,1,  1,-1,   1,1
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  // create two floating point textures for ping-pong
  let width = 512, height = 512; // we'll resize later
  function createFBO(w,h){
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // use RGBA32F if available, otherwise fallback to RGBA
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, w, h, 0, gl.RG, gl.FLOAT, null);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    return {tex, fb, w, h};
  }

  // helper: check extension for float textures
  if (!gl.getExtension('EXT_color_buffer_float')) {
    console.warn('EXT_color_buffer_float not available; the RD shader may not run correctly.');
  }

  let fboA = createFBO(width, height);
  let fboB = createFBO(width, height);
  let ping = fboA, pong = fboB;

  // initialize state with mostly A=1, B=0 plus a small random region of B
  function seed(fbo){
    const size = fbo.w * fbo.h * 2;
    const data = new Float32Array(size);
    for (let i=0;i<size;i+=2){
      data[i] = 1.0; // A
      data[i+1] = 0.0; // B
    }
    // central blob
    const cx = Math.floor(fbo.w*0.5);
    const cy = Math.floor(fbo.h*0.5);
    for (let y=-12;y<=12;y++){
      for (let x=-12;x<=12;x++){
        const sx = cx + x;
        const sy = cy + y;
        if (sx<0||sx>=fbo.w||sy<0||sy>=fbo.h) continue;
        const idx = (sy*fbo.w + sx) * 2;
        data[idx] = 0.5;
        data[idx+1] = 0.25 + Math.random()*0.5;
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, fbo.w, fbo.h, 0, gl.RG, gl.FLOAT, data);
  }

  seed(ping);
  seed(pong);

  // full-screen draw helper
  function drawTo(fbo){
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.fb : null);
    gl.viewport(0,0,(fbo?fbo.w:gl.canvas.width),(fbo?fbo.h:gl.canvas.height));
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  // resize canvas and FBOs to match display size while keeping power-of-two-ish dims
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(128, Math.floor(window.innerWidth * dpr));
    const h = Math.max(128, Math.floor(window.innerHeight * dpr));
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    // choose smaller simulation resolution to save perf
    const simScale = Math.max(1, Math.floor(dpr * 0.75));
    const simW = Math.max(128, Math.floor(window.innerWidth / simScale));
    const simH = Math.max(128, Math.floor(window.innerHeight / simScale));
    // recreate FBOs if size changed
    if (simW !== ping.w || simH !== ping.h) {
      fboA = createFBO(simW, simH);
      fboB = createFBO(simW, simH);
      ping = fboA; pong = fboB;
      seed(ping); seed(pong);
    }
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  window.addEventListener('resize', () => { resize(); });

  // state / params
  let paused = false;
  const params = {
    dA: 1.0,
    dB: 0.5,
    feed: 0.037,
    kill: 0.06
  };

  // mouse interaction
  let mouseUV = [-1,-1];
  let isDown = false;
  function setMouseFromEvent(e){
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width);
    const y = 1 - ((e.clientY - rect.top) / rect.height);
    mouseUV = [x, y];
  }
  canvas.addEventListener('pointerdown', (e) => { isDown = true; setMouseFromEvent(e); });
  canvas.addEventListener('pointermove', (e) => { if(isDown) setMouseFromEvent(e); });
  window.addEventListener('pointerup', (e) => { isDown = false; mouseUV = [-1,-1]; });

  // ping-pong simulation step
  function stepSim(time){
    // run one sim step: render simProg using ping as input and write to pong
    gl.useProgram(simProg);
    // uniforms
    const locPrev = gl.getUniformLocation(simProg, 'u_prev');
    const locPx = gl.getUniformLocation(simProg, 'u_px');
    const locDA = gl.getUniformLocation(simProg, 'dA');
    const locDB = gl.getUniformLocation(simProg, 'dB');
    const locFeed = gl.getUniformLocation(simProg, 'feed');
    const locKill = gl.getUniformLocation(simProg, 'kill');
    const locMouse = gl.getUniformLocation(simProg, 'u_mouse');
    const locTime = gl.getUniformLocation(simProg, 'u_time');

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping.tex);
    gl.uniform1i(locPrev, 0);
    gl.uniform2f(locPx, 1.0 / ping.w, 1.0 / ping.h);
    gl.uniform1f(locDA, params.dA);
    gl.uniform1f(locDB, params.dB);
    gl.uniform1f(locFeed, params.feed);
    gl.uniform1f(locKill, params.kill);
    if (isDown) {
      gl.uniform2f(locMouse, mouseUV[0], mouseUV[1]);
    } else {
      gl.uniform2f(locMouse, -1.0, -1.0);
    }
    gl.uniform1f(locTime, time * 0.001);

    // draw
    gl.bindFramebuffer(gl.FRAMEBUFFER, pong.fb);
    gl.viewport(0,0,pong.w,pong.h);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // swap
    const tmp = ping; ping = pong; pong = tmp;
  }

  // render to screen
  function renderToScreen(){
    gl.useProgram(displayProg);
    const locTex = gl.getUniformLocation(displayProg, 'u_tex');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping.tex);
    gl.uniform1i(locTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  // animation loop
  let last = performance.now();
  function loop(t){
    if (!paused) {
      // run multiple simulation steps per frame for stability (tune as needed)
      const steps = 4;
      for (let i=0;i<steps;i++) stepSim(t);
    }
    renderToScreen();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // controls
  const pauseBtn = document.getElementById('pauseBtn');
  const clearBtn = document.getElementById('clearBtn');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });
  clearBtn.addEventListener('click', () => {
    seed(ping);
    seed(pong);
  });

  // initial subtle seeding to create a pattern over time
  // we already seeded; add periodic random splats
  setInterval(() => {
    if (!paused) {
      // random seed near center-left/right occasionally
      const cx = 0.25 + Math.random()*0.5;
      const cy = 0.25 + Math.random()*0.5;
      // temporarily simulate a mouse splat
      mouseUV = [cx, cy];
      setTimeout(()=> { mouseUV = [-1,-1]; }, 80);
    }
  }, 1200);

})();
