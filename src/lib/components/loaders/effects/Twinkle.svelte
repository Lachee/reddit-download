<script lang="ts">
  // TwinkleThumbnail.svelte — applies the "AI generating" frosted-glass + drifting
  // twinkle effect to a thumbnail image, in a WebGL canvas.
  //
  //   <TwinkleThumbnail thumbnail="https://…/thumb.jpg" alt="Preview" active={loading} />
  //
  // The image is drawn cover-fit. This is an OVERLAY layer: when `active` is true it
  // shimmers; when `active` is false it fades out (CSS opacity) to reveal whatever DOM
  // content is stacked underneath it, and the WebGL render loop stops once it's hidden.
  //
  // To reveal content, stack it beneath the canvas in the same box, e.g.:
  //
  //   <div style="position:relative">
  //     <RealContent />
  //     <TwinkleThumbnail … active={loading}
  //                       style="position:absolute; inset:0" />
  //   </div>
  //
  // NOTE: the image URL must be CORS-readable (the server must send
  // Access-Control-Allow-Origin). Otherwise the canvas is tainted and we fall
  // back to a plain <img>.

  import { onMount } from 'svelte';

  interface Props {
    thumbnail: string;
    width: number;
    height: number;
    alt?: string;
    /** true = shimmering; false = fade out and reveal content underneath */
    active: boolean;
    /** 0..1 strength of the effect when active */
    intensity?: number;
    /** ms ease when toggling `active` (also the CSS fade duration) */
    transition?: number;
    // ---- effect tunables (sensible defaults; rarely need changing) ----
    blur?: number;        // frosted blur radius (fraction of height)
    fog?: number;         // wash toward grey
    cellPx?: number;      // glitter grid cell size in px (smaller = denser)
    sparkGain?: number;   // glitter brightness
    twSpeed?: number;     // twinkle fade rate (lower = slower)
    twSharp?: number;     // flash shape (higher = briefer)
    pDrift?: number;      // per-particle wander distance
    pDriftSp?: number;    // per-particle wander speed
    blobScale?: number;   // shimmer-patch size
    blobSpeed?: number;   // patch upward drift
    blobCon?: number;     // patch contrast
    blobFloor?: number;   // shimmer floor outside patches
    wander?: number;      // overall patch drift speed
    failed?: boolean;
    class?: string;

    /** any extra attributes (style, id, data-*, …) are forwarded to the element */
    [key: string]: unknown;
  }

  let {
        thumbnail,
        width,
        height,
        alt              = '',
        active           = true,
        intensity        = 1,
        transition       = 450,
        blur             = 0.045,
        fog              = 0.1,
        cellPx           = 0.6,
        sparkGain        = 1.15,
        twSpeed          = 2.0,
        twSharp          = 6.0,
        pDrift           = 0.1,
        pDriftSp         = 0.45,
        blobScale        = 2.6,
        blobSpeed        = 0.05,
        blobCon          = 1.7,
        blobFloor        = 0.14,
        wander           = 1.3,
        failed           = $bindable(),
        class: className = '',
        ...    rest
      }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hidden = $state(!active);        // drives the reveal (opacity / pointer-events)
  let pendingSrc: string | null = null;
  let ready = false;
  let applyActive: (on: boolean) => void = () => {
  };   // set in onMount
  let loadTexture: (url: string) => void = (url: string) => {
    pendingSrc = url;
  };

  // ---- shaders ------------------------------------------------------------
  const VERT = `
    attribute vec2 a;
    void main(){ gl_Position = vec4(a, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform sampler2D u_tex;
    uniform float u_imgAspect;
    uniform float u_gen;
    uniform float u_blur, u_fog, u_cellPx, u_sparkGain;
    uniform float u_twSpeed, u_twSharp, u_pDrift, u_pDriftSp;
    uniform float u_blobScale, u_blobSpeed, u_blobCon, u_blobFloor, u_wander;

    const int   BLUR_TAPS = 24;
    const float V_STREAK  = 1.65;

    float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
    float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    vec2  hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }

    float vnoise(vec2 p){
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      float a=hash21(i), b=hash21(i+vec2(1.,0.)), c=hash21(i+vec2(0.,1.)), d=hash21(i+vec2(1.,1.));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }
    float fbm(vec2 p){
      float s=0.0, amp=0.5; mat2 R=mat2(0.80,-0.60,0.60,0.80);
      for(int i=0;i<4;i++){ s+=amp*vnoise(p); p=R*p*2.0; amp*=0.5; }
      return s;
    }

    // cover-fit mapping of screen uv -> texture uv
    vec2 coverUV(vec2 uv){
      float A = u_res.x/u_res.y;
      vec2 scale = (A > u_imgAspect) ? vec2(1.0, u_imgAspect/A)
                                     : vec2(A/u_imgAspect, 1.0);
      return (uv - 0.5)*scale + 0.5;
    }
    vec3 src(vec2 uv){ return texture2D(u_tex, uv).rgb; }

    vec3 frosted(vec2 uv, vec2 frag, float radius){
      if(radius < 0.0008) return src(uv);
      float ga=2.39996323, j=hash21(frag)*6.2831853;
      vec3 acc=vec3(0.0); float wsum=0.0;
      for(int i=0;i<BLUR_TAPS;i++){
        float fi=float(i);
        float r=sqrt((fi+0.5)/float(BLUR_TAPS));
        float a=fi*ga + j;
        vec2 off=vec2(cos(a), sin(a)*V_STREAK)*r*radius;
        float w=1.0 - r*0.55;
        acc+=src(uv+off)*w; wsum+=w;
      }
      return acc/wsum;
    }

    float sparkLayer(vec2 frag, float cell, float seed, float t){
      vec2 g=frag/cell, id=floor(g), f=fract(g);
      vec2 rnd=hash22(id+seed);
      float ph2=hash21(id*5.7+seed)*6.2831853;
      rnd += u_pDrift*vec2(sin(t*u_pDriftSp+ph2), cos(t*u_pDriftSp*0.87+ph2*1.3));
      float live=step(0.55, hash21(id*1.7+seed));
      float d=length(f-rnd);
      float dot=1.0 - smoothstep(0.0,0.9,d); dot*=dot;
      float phase=hash21(id*3.1+seed)*6.2831853;
      float tw=0.5+0.5*sin(t*u_twSpeed+phase);
      tw=pow(tw, u_twSharp);
      return dot*tw*live;
    }

    float shimmerMask(vec2 p, float t){
      t*=u_wander;
      vec2 q=p*u_blobScale;
      vec2 flow=vec2(fbm(q*0.5+t*0.05), fbm(q*0.5+7.3-t*0.04))-0.5;
      q+=flow*1.6;
      q+=vec2(0.0, -t*u_blobSpeed);
      q+=0.5*vec2(sin(t*0.27), cos(t*0.21));
      float m=fbm(q);
      m=smoothstep(0.32,0.80,m);
      m=pow(m, u_blobCon);
      return u_blobFloor + (1.0-u_blobFloor)*m;
    }

    float glitter(vec2 frag, float t){
      float s  = sparkLayer(frag, u_cellPx,        11.0, t);
      s += sparkLayer(frag, u_cellPx*1.45,   29.0, t)*0.8;
      vec2 p=frag/u_res; p.x*=u_res.x/u_res.y;
      return s*shimmerMask(p, t);
    }

    void main(){
      vec2 frag=gl_FragCoord.xy, uv=frag/u_res;
      vec2 texUV=coverUV(uv);

      vec3 sharp=src(texUV);
      vec3 blur=frosted(texUV, frag, u_blur*u_gen);
      float luma=dot(blur, vec3(0.299,0.587,0.114));
      vec3 plate=mix(blur, mix(blur, vec3(luma*0.85+0.25), u_fog), u_gen);
      vec3 col=mix(sharp, plate, u_gen);

      col += glitter(frag, u_time)*u_sparkGain*u_gen;
      col += 0.015*u_gen;
      gl_FragColor=vec4(col, 1.0);
    }
  `;

  const UNIFORM_NAMES = [
    'u_res', 'u_time', 'u_tex', 'u_imgAspect', 'u_gen', 'u_blur', 'u_fog',
    'u_cellPx', 'u_sparkGain', 'u_twSpeed', 'u_twSharp', 'u_pDrift', 'u_pDriftSp',
    'u_blobScale', 'u_blobSpeed', 'u_blobCon', 'u_blobFloor', 'u_wander',
  ] as const;
  type UniformName = (typeof UNIFORM_NAMES)[number];
  type Uniforms = Record<UniformName, WebGLUniformLocation | null>;

  // ---- WebGL plumbing -----------------------------------------------------
  function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('createShader returned null');
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed');
    return sh;
  }

  onMount(() => {
    const el = canvas;
    if (!el) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    let running = false;                 // is the rAF loop currently scheduled?
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    let imgAspect = 1;
    let hasTex = false;

    let gl: WebGLRenderingContext;
    let tex: WebGLTexture;
    const u = {} as Uniforms;

    try {
      const ctx = (el.getContext('webgl', { premultipliedAlpha: false, antialias: false }) ??
        el.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!ctx) throw new Error('no webgl');
      gl = ctx;

      const program = gl.createProgram();
      if (!program) throw new Error('createProgram returned null');
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ -1, -1, 3, -1, -1, 3 ]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      for (const name of UNIFORM_NAMES) u[name] = gl.getUniformLocation(program, name);

      const texture = gl.createTexture();
      if (!texture) throw new Error('createTexture returned null');
      tex = texture;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([ 40, 40, 44, 255 ])); // grey placeholder until the image loads
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (e) {
      console.warn('[TwinkleThumbnail] WebGL unavailable, falling back to <img>:', e);
      failed = true;
      return;
    }

    function resize(): void {
      if (el === null) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(el.clientWidth * dpr));
      const h = Math.max(1, Math.round(el.clientHeight * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
    }

    // redraw on resize, but only while the layer is actually showing
    observer = new ResizeObserver(() => {
      resize();
      if (!hidden) pump();
    });
    observer.observe(el);
    resize();

    loadTexture = (url: string): void => {
      if (!url) {
        hasTex = false;
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
          hasTex = true;
          if (!hidden) pump();   // draw it as soon as it's ready, if we're visible
        } catch (e) {
          console.warn('[TwinkleThumbnail] texture upload failed (CORS?):', e);
          failed = true;
        }
      };
      img.onerror = () => {
        failed = true;
      };
      img.src = url;
    };
    ready = true;
    if (pendingSrc) loadTexture(pendingSrc);

    function draw(now: number): void {
      if (!hasTex || el === null) return;
      gl.viewport(0, 0, el.width, el.height);
      gl.uniform2f(u.u_res, el.width, el.height);
      gl.uniform1f(u.u_time, reduce ? 0 : (now - start) / 1000);
      gl.uniform1i(u.u_tex, 0);
      gl.uniform1f(u.u_imgAspect, imgAspect);
      gl.uniform1f(u.u_gen, intensity);   // full effect while visible; CSS fades the layer
      gl.uniform1f(u.u_blur, blur);
      gl.uniform1f(u.u_fog, fog);
      gl.uniform1f(u.u_cellPx, cellPx);
      gl.uniform1f(u.u_sparkGain, sparkGain);
      gl.uniform1f(u.u_twSpeed, twSpeed);
      gl.uniform1f(u.u_twSharp, twSharp);
      gl.uniform1f(u.u_pDrift, pDrift);
      gl.uniform1f(u.u_pDriftSp, pDriftSp);
      gl.uniform1f(u.u_blobScale, blobScale);
      gl.uniform1f(u.u_blobSpeed, blobSpeed);
      gl.uniform1f(u.u_blobCon, blobCon);
      gl.uniform1f(u.u_blobFloor, blobFloor);
      gl.uniform1f(u.u_wander, wander);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now: number): void {
      draw(now);
      // reduced-motion is a still image — one frame is enough, then go idle
      if (reduce && hasTex) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function pump(): void {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function stop(): void {
      running = false;
      cancelAnimationFrame(raf);
    }

    applyActive = (on: boolean): void => {
      clearTimeout(hideTimer);
      if (on) {
        hidden = false;     // CSS fades the canvas back in
        pump();             // resume shimmering
      } else {
        hidden = true;      // CSS fades the canvas out -> content underneath shows
        hideTimer = setTimeout(stop, Math.max(1, transition)); // stop once invisible
      }
    };
    applyActive(active);    // honor the initial state

    return () => {
      clearTimeout(hideTimer);
      stop();
      observer?.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      ready = false;
      applyActive = () => {
      };
    };
  });

  // fade in/out + start/stop the loop whenever `active` toggles
  $effect(() => {
    active; // track
    applyActive(active);
  });

  // react to src changes (reload the texture)
  $effect(() => {
    const url = thumbnail;
    if (ready) loadTexture(url);
    else pendingSrc = url;
  });
</script>

{#if failed}
    <img
            class={`twinkle-thumb ${className}`}
            class:is-hidden={hidden}
            style:--twinkle-transition={`${transition}ms`}
            src={thumbnail}
            {alt}
            aria-hidden={hidden ? 'true' : undefined}
            {...rest}/>
{:else}
    <canvas
            bind:this={canvas}
            class={`twinkle-thumb ${className}`}
            class:is-hidden={hidden}
            style:--twinkle-transition={`${transition}ms`}
            role="img"
            aria-label={alt}
            aria-hidden={hidden ? 'true' : undefined}
            {width}
            {height}
            {...rest}
    ></canvas>
{/if}

<style>
    .twinkle-thumb {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover; /* applies to the <img> fallback */
        opacity: 1;
        transition: opacity var(--twinkle-transition, 450ms) ease;
    }

    .twinkle-thumb.is-hidden {
        opacity: 0;
        pointer-events: none; /* let clicks reach the content underneath */
    }
</style>