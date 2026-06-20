<script lang="ts">
  let {
        active,
        width,
        height,
        thumbnail,
      }: {
    active: boolean,
    width: number,
    height: number,
    thumbnail: string,
  } = $props();

</script>


<style>
    .bubble-gradient {
        position: absolute;
        inset: 0;
        overflow: hidden;
        z-index: 10;
        transition: opacity 0.4s ease-out;

        background: radial-gradient(circle at 20% 30%, rgba(244, 114, 182, 0.85), transparent 30%),
        radial-gradient(circle at 80% 25%, rgba(125, 211, 252, 0.85), transparent 32%),
        radial-gradient(circle at 50% 85%, rgba(134, 239, 172, 0.7), transparent 34%),
        radial-gradient(circle at 15% 85%, rgba(253, 224, 71, 0.75), transparent 28%),
        radial-gradient(circle at 85% 80%, rgba(196, 181, 253, 0.8), transparent 32%),
        linear-gradient(135deg, #fdf2f8, #eff6ff);

        background-size: 130% 130%;
        animation: bubble-gradient 3s ease-in-out infinite alternate;
    }

    .bubble-gradient.loaded {
        opacity: 0;
        pointer-events: none;
    }

    .bubble-gradient::before {
        content: "";
        position: absolute;
        inset: 0;
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        background: rgba(255, 255, 255, 0.12);
    }

    @keyframes bubble-gradient {
        0% {
            background-position: 0% 0%,
            100% 10%,
            50% 100%,
            0% 100%,
            100% 100%,
            center;
        }

        50% {
            background-position: 35% 20%,
            70% 45%,
            60% 70%,
            25% 80%,
            80% 60%,
            center;
        }

        100% {
            background-position: 10% 45%,
            95% 30%,
            35% 85%,
            40% 95%,
            70% 75%,
            center;
        }
    }
</style>

<div class="bubble-gradient" class:loaded={!active}>Loading</div>
{#if active}
    <div style="max-width: 100%; width: {width}px; height: {height}px"></div>
{/if}
