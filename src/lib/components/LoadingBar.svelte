<script lang="ts">
  import { navigating } from '$app/state';
  import { onDestroy, untrack } from 'svelte';

  let p = $state(0);
  let visible = $state(false);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const isNavigating = navigating.to !== null;

    untrack(() => {
      clearTimeout(timer);
      clearTimeout(hideTimer);

      if (isNavigating) {
        visible = true;
        p = 0;
        animate();
      } else {
        p = 100;

        hideTimer = setTimeout(() => {
          visible = false;
          p = 0;
        }, 200);
      }
    });
  });

  function animate() {
    if (p < 90) {
      p += Math.random() * 2;
      timer = setTimeout(animate, 100);
    }
  }

  onDestroy(() => {
    clearTimeout(timer);
    clearTimeout(hideTimer);
  });
</script>

{#if visible}
    <div class="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none">
        <div
                class="h-full bg-orange-600 transition-all duration-200 ease-out"
                style="width: {p}%"
        ></div>
    </div>
{/if}