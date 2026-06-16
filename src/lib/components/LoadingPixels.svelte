<script lang="ts">
  let {
        mediaElement,
        thumbnail,
        width,
        height,
        pixelSize = 2,
        gap = 4,
        fit = 'cover',
        sparkle = 0.18,
        blur = 28,
        backgroundOpacity = 0.55,
        rippleAmplitude = 1.6,
        rippleSpeed = 0.0025,
        rippleFrequency = 0.05,
        waveBrightness = 0.32,
      }: {
    mediaElement: HTMLImageElement | HTMLVideoElement | undefined;
    thumbnail: string | undefined;
    width: number;
    height: number;
    pixelSize?: number;
    gap?: number;
    fit?: 'cover' | 'contain';
    sparkle?: number;
    blur?: number;
    backgroundOpacity?: number;
    rippleAmplitude?: number;
    rippleSpeed?: number;
    rippleFrequency?: number;
    waveBrightness?: number;
  } = $props();

  let completed = $state(false);
  let canvasElement = $state<HTMLCanvasElement>();
  let imageElement = $state<HTMLImageElement>();

  let loading = $derived(!completed || mediaElement === undefined);

  let animationFrame: number | undefined;
  let resizeObserver: ResizeObserver | undefined;

  type Pixel = {
    x: number;
    y: number;
    radius: number;
    color: string;
    r: number;
    g: number;
    b: number;
    alpha: number;
    delay: number;
    distanceFromCenter: number;
    directionX: number;
    directionY: number;
    shimmerOffset: number;
    shimmerSpeed: number;
    twinkleOffset: number;
    twinkleSpeed: number;
    twinkleStrength: number;
  };

  let pixels: Pixel[] = [];
  let startedAt = 0;

  function onLoaded() {
    console.log('[bubble] loaded');
    completed = true;
  }

  function onError() {
    console.log('[bubble] loaded (error)');
    completed = true;
  }

  function stopAnimation() {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function brightenChannel(value: number, amount: number) {
    return Math.round(value + (255 - value) * amount);
  }

  function getWaveColor(pixel: Pixel, amount: number) {
    if (amount <= 0.01) return pixel.color;

    return `rgb(${
      brightenChannel(pixel.r, amount)
    } ${
      brightenChannel(pixel.g, amount)
    } ${
      brightenChannel(pixel.b, amount)
    })`;
  }

  function getCanvasSize() {
    if (!canvasElement) return { width: 0, height: 0 };

    const rect = canvasElement.getBoundingClientRect();

    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
  }

  function drawImageToSampleCanvas(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    sampleWidth: number,
    sampleHeight: number,
  ) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = sampleWidth / sampleHeight;

    context.clearRect(0, 0, sampleWidth, sampleHeight);
    context.imageSmoothingEnabled = false;

    if (fit === 'contain') {
      let drawWidth = sampleWidth;
      let drawHeight = sampleHeight;
      let drawX = 0;
      let drawY = 0;

      if (imageRatio > canvasRatio) {
        drawHeight = sampleWidth / imageRatio;
        drawY = (sampleHeight - drawHeight) / 2;
      } else {
        drawWidth = sampleHeight * imageRatio;
        drawX = (sampleWidth - drawWidth) / 2;
      }

      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      return;
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (imageRatio > canvasRatio) {
      sourceWidth = image.naturalHeight * canvasRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = image.naturalWidth / canvasRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sampleWidth,
      sampleHeight,
    );
  }

  function createPixels() {
    if (!canvasElement || !imageElement) return;

    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    const radius = Math.max(0.5, pixelSize);
    const step = Math.max(1, radius * 2 + gap);

    const cols = Math.ceil(canvasWidth / step);
    const rows = Math.ceil(canvasHeight / step);

    const sampleCanvas = document.createElement('canvas');
    const sampleContext = sampleCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!sampleContext) return;

    sampleCanvas.width = cols;
    sampleCanvas.height = rows;

    drawImageToSampleCanvas(sampleContext, imageElement, cols, rows);

    let data: Uint8ClampedArray;

    try {
      data = sampleContext.getImageData(0, 0, cols, rows).data;
    } catch (error) {
      console.warn('[bubble] thumbnail pixel sampling failed', error);
      pixels = [];
      drawFallback();
      return;
    }

    const nextPixels: Pixel[] = [];
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = (row * cols + col) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        if (a <= 8) continue;

        const x = col * step + radius;
        const y = row * step + radius;

        const offsetX = x - centerX;
        const offsetY = y - centerY;
        const distanceFromCenter = Math.hypot(offsetX, offsetY);
        const safeDistance = Math.max(1, distanceFromCenter);

        const brightness = (r + g + b) / 765;

        nextPixels.push({
          x,
          y,
          radius,
          color: `rgb(${r} ${g} ${b})`,
          r,
          g,
          b,
          alpha: a / 255,
          delay: distanceFromCenter * 0.9,
          distanceFromCenter,
          directionX: offsetX / safeDistance,
          directionY: offsetY / safeDistance,
          shimmerOffset: Math.random() * Math.PI * 2,
          shimmerSpeed: 0.0012 + Math.random() * 0.0018,
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.0025 + Math.random() * 0.004,
          twinkleStrength: clamp((0.16 + brightness * 0.32) * sparkle, 0, 0.4),
        });
      }
    }

    pixels = nextPixels;
    startedAt = performance.now();

    stopAnimation();
    animate();
  }

  function resizeCanvas() {
    if (!canvasElement) return;

    const context = canvasElement.getContext('2d');
    if (!context) return;

    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    const dpr = window.devicePixelRatio || 1;

    canvasElement.width = Math.floor(canvasWidth * dpr);
    canvasElement.height = Math.floor(canvasHeight * dpr);

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (imageElement?.complete) {
      createPixels();
    } else {
      drawFallback();
    }
  }

  function drawFallback() {
    if (!canvasElement) return;

    const context = canvasElement.getContext('2d');
    if (!context) return;

    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#f472b6');
    gradient.addColorStop(0.35, '#7dd3fc');
    gradient.addColorStop(0.7, '#86efac');
    gradient.addColorStop(1, '#c4b5fd');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawCircle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number,
  ) {
    context.globalAlpha = alpha;
    context.fillStyle = color;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 1;
  }

  function animate() {
    if (!canvasElement) return;

    const context = canvasElement.getContext('2d');
    if (!context) return;

    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    const now = performance.now();
    const elapsed = now - startedAt;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (pixels.length === 0) {
      drawFallback();
      animationFrame = requestAnimationFrame(animate);
      return;
    }

    const amplitude = Math.max(0, rippleAmplitude);
    const speed = Math.max(0, rippleSpeed);
    const frequency = Math.max(0.001, rippleFrequency);
    const brightnessAmount = clamp(waveBrightness, 0, 0.75);

    for (const pixel of pixels) {
      const appearProgress = Math.min(1, Math.max(0, (elapsed - pixel.delay) / 240));
      const easedProgress = 1 - Math.pow(1 - appearProgress, 3);

      const shimmer = Math.sin(now * pixel.shimmerSpeed + pixel.shimmerOffset) * 0.025;
      const rawTwinkle = Math.sin(now * pixel.twinkleSpeed + pixel.twinkleOffset);

      const twinkle = 1 - Math.pow(Math.max(0, rawTwinkle), 6) * pixel.twinkleStrength;

      const ripplePhase = pixel.distanceFromCenter * frequency - now * speed;
      const rippleEnvelope = 0.55 + Math.sin(pixel.distanceFromCenter * 0.012 - now * speed * 0.35) * 0.15;

      const rippleSine = Math.sin(ripplePhase);
      const ripple = rippleSine * amplitude * rippleEnvelope * easedProgress;

      const waveCrest = Math.pow(Math.max(0, rippleSine), 2);
      const waveLight = waveCrest * brightnessAmount * easedProgress;

      const x = pixel.x + pixel.directionX * ripple;
      const y = pixel.y + pixel.directionY * ripple;

      const scalePulse = waveCrest * 0.08;
      const scale = easedProgress * clamp(twinkle + shimmer + scalePulse, 0.58, 1.08);

      const alpha = pixel.alpha * easedProgress * clamp(twinkle + waveCrest * 0.22, 0.5, 1);

      drawCircle(
        context,
        x,
        y,
        pixel.radius * scale,
        getWaveColor(pixel, waveLight),
        alpha,
      );
    }

    animationFrame = requestAnimationFrame(animate);
  }

  $effect(() => {
    void mediaElement;

    console.log('[bubble] unloaded (element changed)');
    completed = false;

    if (mediaElement) {
      mediaElement.addEventListener('error', onError);
      mediaElement.addEventListener('canplay', onLoaded);
      mediaElement.addEventListener('load', onLoaded);
      mediaElement.addEventListener('loadeddata', onLoaded);

      if (mediaElement instanceof HTMLImageElement && mediaElement.complete) {
        onLoaded();
      } else if (mediaElement instanceof HTMLVideoElement && mediaElement.readyState >= 3) {
        onLoaded();
      }
    }

    return () => {
      mediaElement?.removeEventListener('error', onError);
      mediaElement?.removeEventListener('canplay', onLoaded);
      mediaElement?.removeEventListener('load', onLoaded);
      mediaElement?.removeEventListener('loadeddata', onLoaded);
    };
  });

  $effect(() => {
    if (!canvasElement) return;

    resizeObserver?.disconnect();

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(canvasElement);

    resizeCanvas();

    return () => {
      resizeObserver?.disconnect();
      resizeObserver = undefined;
    };
  });

  $effect(() => {
    if (!thumbnail || !canvasElement) {
      imageElement = undefined;
      pixels = [];
      drawFallback();
      return;
    }

    const image = new Image();

    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.src = thumbnail;

    image
      .decode()
      .then(() => {
        imageElement = image;
        createPixels();
      })
      .catch((error) => {
        console.warn('[bubble] thumbnail failed to load', error);
        imageElement = undefined;
        pixels = [];
        drawFallback();
      });

    return () => {
      stopAnimation();
    };
  });

  $effect(() => {
    void pixelSize;
    void gap;
    void fit;
    void width;
    void height;
    void sparkle;
    void rippleAmplitude;
    void rippleSpeed;
    void rippleFrequency;
    void waveBrightness;

    if (imageElement?.complete) {
      createPixels();
    }
  });
</script>

<style>
    .bubble {
        position: absolute;
        inset: 0;
        z-index: 10;
        overflow: hidden;
        transition: opacity 0.4s ease-out;
        background: #08080b;
    }

    .bubble.loaded {
        opacity: 0;
        pointer-events: none;
    }

    .thumbnail-background {
        position: absolute;
        inset: 0;
        z-index: 0;

        width: 100%;
        height: 100%;
        object-fit: cover;

        opacity: var(--background-opacity);
        filter: blur(var(--background-blur)) saturate(1.15);
        transform: scale(1.12);

        pointer-events: none;
        user-select: none;
    }

    .thumbnail-background.contain {
        object-fit: contain;
    }

    .pixel-canvas {
        position: absolute;
        inset: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
    }

    .bubble::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        opacity: 0.5;

        background:
                radial-gradient(circle at 50% 50%, transparent 0%, transparent 48%, rgba(0, 0, 0, 0.28) 100%),
                linear-gradient(135deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.18));

        animation: bubble-highlight 3s ease-in-out infinite alternate;
    }

    .fallback-label {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        color: rgba(255, 255, 255, 0.75);
        font-size: 0.875rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }

    .spacer {
        max-width: 100%;
    }

    @keyframes bubble-highlight {
        0% {
            opacity: 0.38;
            transform: scale(1);
        }

        100% {
            opacity: 0.54;
            transform: scale(1.018);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .bubble::after {
            animation: none;
        }
    }
</style>

<div
        class="bubble"
        class:loaded={!loading}
        aria-hidden={!loading}
        style:--background-blur={`${blur}px`}
        style:--background-opacity={backgroundOpacity}
>
    {#if thumbnail}
        <img
                class="thumbnail-background"
                class:contain={fit === 'contain'}
                src={thumbnail}
                alt=""
                aria-hidden="true"
                draggable="false"
        />
    {/if}

    <canvas bind:this={canvasElement} class="pixel-canvas"></canvas>

    {#if !thumbnail}
        <div class="fallback-label">Loading</div>
    {/if}
</div>

{#if loading}
    <div class="spacer" style="width: {width}px; height: {height}px"></div>
{/if}