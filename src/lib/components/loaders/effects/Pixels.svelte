<script lang="ts">
  let {
        active,
        thumbnail,
        width,
        height,

        pixelSize = 2,
        gap = 5,
        fit = 'cover',
        speed = 35,
        blur = 28,
        backgroundOpacity = 0.5,
        sparkleBrightness = 0.18,
      }: {
    active: boolean;
    thumbnail: string | undefined;
    width: number;
    height: number;
    pixelSize?: number;
    gap?: number;
    fit?: 'cover' | 'contain';
    speed?: number;
    blur?: number;
    backgroundOpacity?: number;
    sparkleBrightness?: number;
  } = $props();

  let canvasElement = $state<HTMLCanvasElement>();
  let imageElement = $state<HTMLImageElement>();


  let animationFrame: number | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let timePrevious = performance.now();
  const timeInterval = 1000 / 60;

  type Pixel = {
    x: number;
    y: number;

    r: number;
    g: number;
    b: number;
    color: string;
    alpha: number;

    size: number;
    sizeStep: number;
    minSize: number;
    maxSize: number;
    maxSizeInteger: number;

    delay: number;
    counter: number;
    counterStep: number;

    speed: number;

    isIdle: boolean;
    isReverse: boolean;
    isShimmer: boolean;
  };

  let pixels: Pixel[] = [];


  function stopAnimation() {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  function brightenChannel(value: number, amount: number) {
    return Math.round(value + (255 - value) * amount);
  }

  function getCanvasSize() {
    if (!canvasElement) return { width: 0, height: 0 };

    const rect = canvasElement.getBoundingClientRect();

    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
  }

  function getDistanceToCanvasCenter(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    const dx = x - canvasWidth / 2;
    const dy = y - canvasHeight / 2;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function getPixelColor(pixel: Pixel) {
    const brightness = clamp(sparkleBrightness, 0, 0.6);

    if (!pixel.isShimmer || brightness <= 0) {
      return pixel.color;
    }

    const shimmerProgress = clamp(
      (pixel.size - pixel.minSize) / Math.max(0.001, pixel.maxSize - pixel.minSize),
      0,
      1,
    );

    const amount = brightness * shimmerProgress;

    return `rgb(${
      brightenChannel(pixel.r, amount)
    } ${
      brightenChannel(pixel.g, amount)
    } ${
      brightenChannel(pixel.b, amount)
    })`;
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

    const baseSize = Math.max(1, pixelSize);
    const maxSizeInteger = Math.max(2, Math.ceil(baseSize * 1.8));
    const step = Math.max(4, gap);

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

    const particleSpeed = clamp(speed, 0, 100) * 0.001;
    const nextPixels: Pixel[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = (row * cols + col) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        if (a <= 8) continue;

        const x = col * step;
        const y = row * step;

        const minSize = random(0.45, Math.max(0.55, baseSize * 0.45));
        const maxSize = random(minSize, Math.max(minSize + 0.1, baseSize * 1.45));

        nextPixels.push({
          x,
          y,

          r,
          g,
          b,
          color: `rgb(${r} ${g} ${b})`,
          alpha: a / 255,

          size: 0,
          sizeStep: Math.random() * 0.35 + 0.05,
          minSize,
          maxSize,
          maxSizeInteger,

          delay: getDistanceToCanvasCenter(x, y, canvasWidth, canvasHeight),
          counter: 0,
          counterStep: Math.random() * 4 + (canvasWidth + canvasHeight) * 0.01,

          speed: random(0.1, 0.9) * particleSpeed,

          isIdle: false,
          isReverse: false,
          isShimmer: false,
        });
      }
    }

    pixels = nextPixels;

    stopAnimation();
    handleAnimation('appear');
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

  function drawPixel(context: CanvasRenderingContext2D, pixel: Pixel) {
    const centerOffset = pixel.maxSizeInteger * 0.5 - pixel.size * 0.5;

    context.globalAlpha = pixel.alpha;
    context.fillStyle = getPixelColor(pixel);

    context.beginPath();
    context.arc(
      pixel.x + centerOffset,
      pixel.y + centerOffset,
      Math.max(1, Math.abs(pixel.size)),
      0,
      Math.PI * 2,
    );
    context.fill();


      context.globalAlpha = 1;
  }

  function appear(pixel: Pixel, context: CanvasRenderingContext2D) {
    pixel.isIdle = false;

    if (pixel.counter <= pixel.delay) {
      pixel.counter += pixel.counterStep;
      return;
    }

    if (pixel.size >= pixel.maxSize) {
      pixel.isShimmer = true;
    }

    if (pixel.isShimmer) {
      shimmer(pixel);
    } else {
      pixel.size += pixel.sizeStep;
    }

    drawPixel(context, pixel);
  }

  function disappear(pixel: Pixel, context: CanvasRenderingContext2D) {
    pixel.isShimmer = false;
    pixel.counter = 0;

    if (pixel.size <= 0) {
      pixel.isIdle = true;
      return;
    }

    pixel.size -= 0.1;
    drawPixel(context, pixel);
  }

  function shimmer(pixel: Pixel) {
    if (pixel.size >= pixel.maxSize) {
      pixel.isReverse = true;
    } else if (pixel.size <= pixel.minSize) {
      pixel.isReverse = false;
    }

    if (pixel.isReverse) {
      pixel.size -= pixel.speed;
    } else {
      pixel.size += pixel.speed;
    }
  }

  function handleAnimation(name: 'appear' | 'disappear') {
    stopAnimation();
    animationFrame = requestAnimationFrame(() => animate(name));
  }

  function animate(name: 'appear' | 'disappear') {
    if (!canvasElement) return;

    const context = canvasElement.getContext('2d');
    if (!context) return;

    animationFrame = requestAnimationFrame(() => animate(name));

    const timeNow = performance.now();
    const timePassed = timeNow - timePrevious;

    if (timePassed < timeInterval) return;

    timePrevious = timeNow - (timePassed % timeInterval);

    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (pixels.length === 0) {
      drawFallback();
      return;
    }

    for (const pixel of pixels) {
      if (name === 'appear') {
        appear(pixel, context);
      } else {
        disappear(pixel, context);
      }
    }

    if (name === 'disappear' && pixels.every((pixel) => pixel.isIdle)) {
      stopAnimation();
    }
  }

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
    void speed;
    void sparkleBrightness;

    if (imageElement?.complete) {
      createPixels();
    }
  });

  $effect(() => {
    if (active) {
      handleAnimation('appear');
    } else {
      handleAnimation('disappear');
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
        image-rendering: pixelated;
    }

    .bubble::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        opacity: 0.42;

        background:
                radial-gradient(circle at 50% 50%, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.32) 100%),
                linear-gradient(135deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.16));

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
            opacity: 0.34;
            transform: scale(1);
        }

        100% {
            opacity: 0.5;
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
        class:loaded={!active}
        aria-hidden={!active}
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

{#if active}
    <div class="spacer" style="width: {width}px; height: {height}px"></div>
{/if}