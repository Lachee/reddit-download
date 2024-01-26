<script lang="ts">
  import { proxy } from "$lib/helpers";
  import Sparkle from "$lib/components/Sparkle.svelte";

  let src: string = proxy(
    "https://preview.redd.it/vxn3ax3bs19c1.gif?width=108&crop=smart&format=png8&s=9a084a2cb9138c61bcb0d7a164c43cde393b9541"
  );
  let width: number = 800;
  let height: number = 1000;
</script>

<Sparkle {src} {width} {height} />
