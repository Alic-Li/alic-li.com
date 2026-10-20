// A label texture and a rounded lens share one coordinate system so dragging
// refracts the actual navigation text, including text between two destinations.
const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;
const fragment = `precision highp float;
uniform vec2 size;
uniform float dpr;
uniform sampler2D labels;
uniform vec4 lens;
uniform float press;
uniform float stretch;
uniform float dark;
float capsule(vec2 p, vec2 halfSize) {
  float r = halfSize.y;
  vec2 q = abs(p) - vec2(max(0., halfSize.x-r), 0.);
  return length(vec2(max(q.x, 0.), q.y)) - r;
}
vec4 textAt(vec2 p) { return texture2D(labels, p / size); }
void main() {
  vec2 p = vec2(gl_FragCoord.x / dpr, size.y - gl_FragCoord.y / dpr);
  vec2 local = p - lens.xy;
  vec2 halfSize = lens.zw * vec2(1.+stretch+press*.28, 1.-abs(stretch)*.30+press*.36);
  float opticalPress = max(press, 0.);
  float dist = capsule(local, halfSize);
  float mask = 1.-smoothstep(-.7, .7, dist);
  float depth = clamp(-dist / max(halfSize.y, 1.), 0., 1.);
  // A convex surface magnifies the centre and bends more steeply at its rim.
  vec2 refracted = lens.xy + local / (1.+opticalPress*.24);
  vec2 bend = normalize(local + vec2(.001)) * pow(1.-depth, 3.) * opticalPress * 5.;
  vec2 uv = refracted - bend;
  vec4 baseText = textAt(p);
  vec4 bentText = textAt(uv);
  float dispersion = opticalPress*.55*(1.-depth);
  bentText.r = textAt(uv+vec2(dispersion,0.)).r;
  bentText.b = textAt(uv-vec2(dispersion,0.)).b;
  vec4 text = mix(baseText, bentText, mask);
  // Directional rims describe the top bevel and the reflected lower edge.
  // Keep them visible at rest and strengthen them as the lens lifts on press.
  float topLight = clamp(.5-local.y/max(halfSize.y*2.,1.),0.,1.);
  float sideLight = clamp(.5-local.x/max(halfSize.x*2.,1.),0.,1.);
  float lighting = topLight*.78 + sideLight*.22;
  float rim = exp(-abs(dist+.35)*2.4);
  float innerRim = exp(-abs(dist+1.5)*2.) * mask;
  float lightAlpha = rim * mix(.16,.78,lighting) * (.72+opticalPress*.28);
  lightAlpha += innerRim * (1.-lighting) * (.12+opticalPress*.12);
  lightAlpha = clamp(lightAlpha,0.,.9);
  // A soft downward cast shadow follows the deformed capsule, rather than
  // outlining the rectangular canvas or darkening its transparent centre.
  float shadowDist = capsule(local-vec2(0.,3.+opticalPress*3.),halfSize);
  float shadow = exp(-pow(max(shadowDist,0.)/(5.+opticalPress*2.),2.))
    * (1.-mask) * mix(.13,.24,dark) * (1.+opticalPress*.45);
  float innerShade = exp(-abs(dist+1.)*1.7) * mask * (1.-lighting) * .12;
  float fillAlpha = mix(.085,.055,opticalPress) * mask;
  vec3 fill = mix(vec3(.24,.31,.28),vec3(.90,.96,.94),dark);
  vec4 result = vec4(fill*fillAlpha,fillAlpha);
  result = vec4(vec3(0.),innerShade) + result*(1.-innerShade);
  result = vec4(vec3(lightAlpha),lightAlpha) + result*(1.-lightAlpha);
  result = result + vec4(vec3(0.),shadow)*(1.-result.a);
  vec3 ink = mix(vec3(0.),vec3(.96,.98,.96),dark);
  float inkMix = mask*.55;
  text.rgb = mix(text.rgb, ink*text.a, inkMix);
  gl_FragColor = text + result * (1.-text.a);
}`;

export function createGlassLens(root: HTMLElement, canvas: HTMLCanvasElement) {
  const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const forced = matchMedia('(forced-colors: active)');
  if (transparency.matches || contrast.matches || forced.matches) return null;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram()!;
  for (const [kind, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(kind)!;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'position');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const u = Object.fromEntries(
    ['size', 'dpr', 'labels', 'lens', 'press', 'stretch', 'dark'].map(
      (name) => [name, gl.getUniformLocation(program, name)],
    ),
  );
  const labelCanvas = document.createElement('canvas');
  const ctx = labelCanvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const margin = 28;
  let width = 0,
    height = 0,
    ratio = 1,
    frame = 0,
    last = 0,
    disposed = false;
  let x = 0,
    targetX = 0,
    vx = 0,
    w = 0,
    targetW = 0,
    vw = 0,
    p = 0,
    targetP = 0,
    vp = 0;
  let pressedAt = 0;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  let ready = false;
  let contextLost = false;
  let dark = false;
  let links: { x: number; width: number }[] = [];
  let selected = root
    .querySelector<HTMLAnchorElement>('a[aria-current="page"]')
    ?.getAttribute('href');

  function kick() {
    if (!disposed && !frame) frame = requestAnimationFrame(draw);
  }
  function measure() {
    const bounds = root.getBoundingClientRect();
    width = bounds.width + margin * 2;
    height = bounds.height + margin * 2;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = labelCanvas.width = Math.round(width * ratio);
    canvas.height = labelCanvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const anchors = [...root.querySelectorAll('a')];
    links = anchors.map((link) => {
      const rect = link.getBoundingClientRect();
      return {
        x: rect.left - bounds.left + root.scrollLeft + margin,
        width: rect.width,
      };
    });
    dark = document.documentElement.dataset.theme === 'dark';
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    anchors.forEach((link, index) => {
      const style = getComputedStyle(link);
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.fillText(
        link.textContent || '',
        links[index].x + links[index].width / 2,
        height / 2 + 0.5,
      );
    });
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      labelCanvas,
    );
    const index = anchors.findIndex((a) => a.getAttribute('href') === selected);
    const link = links[Math.max(0, index)];
    if (link) {
      targetX = link.x + link.width / 2;
      targetW = link.width;
      if (!ready) {
        x = targetX;
        w = targetW;
        ready = true;
      }
    }
    kick();
  }
  function draw(time: number) {
    frame = 0;
    if (
      contextLost ||
      transparency.matches ||
      contrast.matches ||
      forced.matches
    ) {
      delete root.dataset.lens;
      return;
    }
    const frameDt = Math.min((time - last) / 1000 || 1 / 60, 1 / 30);
    const dt = frameDt * 0.7;
    last = time;
    // Position follows the target without stored momentum or overshoot, so a
    // direction change responds immediately. Keep the slower elastic spring
    // for size and press feedback only.
    const previousX = x;
    x += (targetX - x) * (1 - Math.exp(-24 * frameDt));
    vx = (x - previousX) / frameDt;
    // Small integration steps keep the shape springs stable across frame rates.
    for (let i = 0; i < 4; i++) {
      const step = dt / 4;
      vw += ((targetW - w) * 480 - vw * 22) * step;
      w += vw * step;
      vp += ((targetP - p) * 600 - vp * 20) * step;
      p += vp * step;
    }
    if (reduced.matches) {
      x = targetX;
      w = targetW;
      p = 0;
      vx = vw = vp = 0;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform2f(u.size, width, height);
    gl!.uniform1f(u.dpr, canvas.width / width);
    gl!.uniform1i(u.labels, 0);
    gl!.uniform4f(
      u.lens,
      x - root.scrollLeft,
      height / 2,
      w / 2,
      (height - margin * 2 - 8) / 2,
    );
    gl!.uniform1f(u.press, Math.max(-0.18, Math.min(1.2, p)));
    gl!.uniform1f(
      u.stretch,
      reduced.matches ? 0 : Math.min(0.1, Math.abs(vx) / 4800),
    );
    gl!.uniform1f(u.dark, dark ? 1 : 0);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    root.dataset.lens = 'ready';
    if (
      Math.abs(x - targetX) +
        Math.abs(vx) +
        Math.abs(w - targetW) +
        Math.abs(vw) +
        Math.abs(p - targetP) +
        Math.abs(vp) >
      0.01
    )
      kick();
  }
  const resize = new ResizeObserver(measure);
  resize.observe(root);
  const theme = new MutationObserver(measure);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  const onLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    delete root.dataset.lens;
  };
  // Keep the DOM fallback after context loss; the GL resources are invalid.
  const onRestored = () => {
    delete root.dataset.lens;
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  const onPreference = () => {
    delete root.dataset.lens;
    if (!transparency.matches && !contrast.matches && !forced.matches) kick();
  };
  for (const media of [transparency, contrast, forced])
    media.addEventListener('change', onPreference);
  measure();
  document.fonts.ready.then(() => {
    if (!disposed) measure();
  });
  return {
    select(href: string) {
      selected = href;
      const anchors = [...root.querySelectorAll('a')];
      const link =
        links[anchors.findIndex((a) => a.getAttribute('href') === href)];
      if (link) {
        targetX = link.x + link.width / 2;
        targetW = link.width;
        kick();
      }
    },
    press(value: boolean) {
      clearTimeout(releaseTimer);
      if (value) {
        pressedAt = performance.now();
        targetP = 1;
        kick();
      } else {
        // A quick tap must still show the enlarged lens before it springs back.
        const remaining = reduced.matches
          ? 0
          : Math.max(0, 220 - (performance.now() - pressedAt));
        releaseTimer = setTimeout(() => {
          targetP = 0;
          kick();
        }, remaining);
      }
    },
    move(clientX: number) {
      const bounds = root.getBoundingClientRect();
      targetX = Math.max(
        margin + targetW / 2,
        Math.min(
          width - margin - targetW / 2,
          clientX - bounds.left + root.scrollLeft + margin,
        ),
      );
      kick();
    },
    refresh: measure,
    destroy() {
      disposed = true;
      clearTimeout(releaseTimer);
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      for (const media of [transparency, contrast, forced])
        media.removeEventListener('change', onPreference);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
      delete root.dataset.lens;
    },
  };
}
