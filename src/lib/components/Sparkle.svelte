<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, onMount } from "svelte";
  import { proxy } from "$lib/helpers";

  type MinMax<T> = { min: T; max: T };

  export let src: string;
  export let width: number;
  export let height: number;
  export let radius: MinMax<number> = { min: 5, max: 5 }; //{ min: 2, max: 6 };
  export let velocity: MinMax<number> = { min: 0, max: 0.05 }; //{ min: 1, max: 2 };
  export let count: number = 100;
  export let blur: number = 5;
  export let bloom: number = 1.5;

  let image: HTMLImageElement | null;
  let canvas: HTMLCanvasElement;
  let isRendering: boolean = false;
  let confetti: Confetti[] = [];

  onMount(() => {
    canvas.width = width + 10;
    canvas.height = height + 10;

    isRendering = true;
    requestAnimationFrame(onAnimationFrame);
  });

  onDestroy(() => {
    confetti = [];
    isRendering = false;
    if (image) image.src = "";
  });

  function onImageLoad() {
    console.log("image load!");
    confetti = createConfetti(count);
    if (image == null) return;
    if (width <= 0) width = image.width;
    if (height <= 0) height = image.height;
    canvas.width = width + 10;
    canvas.height = height + 10;
  }

  function onAnimationFrame(time: number) {
    if (browser && isRendering) {
      render();
      requestAnimationFrame(onAnimationFrame);
    }
  }

  function render() {
    //canvas.width = width;
    //canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx == null) return;

    // Draw the image
    if (image != null) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    // Reset any confetti
    for (const c of confetti) {
      if (c.expired) {
        let lum = 0;
        let ittr = 0;

        // Reset the colour
        c.color = [255, 255, 255];

        // Relocate
        for (let i = 0; i < 5; i++) {
          c.reset();
          const {
            data: [r, g, b],
          } = ctx.getImageData(c.x, c.y, 1, 1);
          const lum = luminance(r, g, b);
          if (lum > 3.5) {
            c.color = [r, g, b];
            break;
          }
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const c of confetti) {
      c.step();
      c.draw(ctx);
    }
  }

  const luminance = (R: number, G: number, B: number): number =>
    Math.sqrt((0.299 * R) ^ (2 + 0.587 * G) ^ (2 + 0.114 * B) ^ 2);
  const range = (a: number, b: number): number => (b - a) * Math.random() + a;
  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    style: string
  ) => {
    if (ctx == null) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = style;
    ctx.fill();
  };

  const createConfetti = (count: number) => {
    let i, j, ref, results;
    results = [];
    for (
      i = j = 1, ref = count;
      1 <= ref ? j <= ref : j >= ref;
      i = 1 <= ref ? ++j : --j
    ) {
      results.push(new Confetti());
    }
    return results;
  };
  class Confetti {
    x = 0;
    y = 0;
    radius = 1;
    color: [number, number, number] = [255, 255, 255];
    private vx = 0;
    private vy = 0;
    private xmax = 0;
    private ymax = 0;
    private opacity = 0;
    private dop = 0;
    private get r2() {
      return this.radius * 2;
    }

    get expired() {
      return this.opacity <= 0; //|| this.y > this.ymax || this.x > this.xmax;
    }

    constructor() {
      this.radius = ~~range(radius.min, radius.max);
      this.reset();
      this.opacity = 0;
    }

    reset(): Confetti {
      this.opacity = 0;
      this.dop = 0.01 * range(1, 4);
      this.x = range(-this.r2, canvas.width + this.r2);
      this.y = range(-this.r2, canvas.height + this.r2);
      this.xmax = canvas.width - this.radius;
      this.ymax = canvas.height - this.radius;
      this.vx =
        range(velocity.min, velocity.max) * (Math.random() > 0.5 ? 1 : -1);
      this.vy =
        range(velocity.min, velocity.max) * (Math.random() > 0.5 ? 1 : -1);
      return this;
    }

    step(): Confetti {
      // Update our deets
      var ref;
      this.x += this.vx;
      this.y += this.vy;
      this.opacity += this.dop;
      if (this.opacity > 1) {
        this.opacity = 1;
        this.dop *= -1;
      }

      // if (!(0 < (ref = this.x) && ref < this.xmax))
      //   this.x = (this.x + this.xmax) % this.xmax;

      return this;
    }

    draw(ctx: CanvasRenderingContext2D): Confetti {
      // We need to be reloaded
      if (this.expired) return this;

      // Draw our circle
      drawCircle(
        ctx,
        ~~this.x,
        ~~this.y,
        this.radius,
        `rgba(${this.color.join(",")},${this.opacity})`
      );
      return this;
    }
  }
</script>

<div class="container" style="--blur: {blur}px; --bloom: {bloom}">
  <img bind:this={image} {src} on:load={onImageLoad} loading="eager" alt="" />
  <canvas bind:this={canvas} />
</div>

<style>
  .container {
    display: inline-block;
    position: relative;
  }

  img {
  }
  canvas {
    position: absolute;
    top: -5px;
    left: -5px;
    filter: blur(var(--blur)) brightness(var(--bloom));
  }
</style>