<script lang="ts">
  import { proxy } from "$lib/helpers";
  import Sparkle from "$lib/components/Sparkle.svelte";

  let src: string = proxy(
    //"https://preview.redd.it/vxn3ax3bs19c1.gif?width=108&crop=smart&format=png8&s=9a084a2cb9138c61bcb0d7a164c43cde393b9541"
    "https://v.redd.it/tiqk2es3jhfc1/DASH_1080.mp4?source=fallback"
  );
  let width: number = 108;
  let height: number = 135;
</script>

<div class="p-20 bg-white h-screen">
  <Sparkle {src} {width} {height} />
</div>
