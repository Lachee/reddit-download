<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, onMount } from "svelte";
  import { proxy } from "$lib/helpers";

  export let src: string = proxy(
    "https://preview.redd.it/vxn3ax3bs19c1.gif?width=108&crop=smart&format=png8&s=9a084a2cb9138c61bcb0d7a164c43cde393b9541"
  );
  export let width: number = 800;
  export let height: number = 1000;
  export let radius = { min: 2, max: 6 };
  export let count: number = 350;

  let image: HTMLImageElement | null;
  let canvas: HTMLCanvasElement;
  let isRendering: boolean = false;
  let particleOffset = 0.5;
  let confetti: Confetti[] = [];

  onMount(() => {
    isRendering = true;
    requestAnimationFrame(onAnimationFrame);
    onImageLoad();
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
    if (width == 0) width = image.width;
    if (height == 0) height = image.height;
    // canvas.width = width;
    // canvas.height = height;
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
        c.reset();
        const { data } = ctx.getImageData(c.x, c.y, 1, 1);
        c.color = [data[0], data[1], data[2]];
      }

      c.step();
      c.draw(ctx);
    }
  }

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
      this.vx = range(0, 2) + 8 * particleOffset - 5;
      this.vy = range(0, 2) + 8 * particleOffset - 5;
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

<img
  bind:this={image}
  {src}
  on:load={onImageLoad}
  loading="eager"
  alt=""
  class="hidden"
/>
<canvas bind:this={canvas} />
