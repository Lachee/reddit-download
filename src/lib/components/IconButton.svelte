<script lang="ts">
    type Variant = 'orange' | 'white';

    interface Props {
        alt?: string;
        variant?: Variant;
        disabled?: boolean;
        onclick?: (event: MouseEvent) => void;
    }

    let {
        alt = 'Download',
        variant = 'orange',
        disabled = false,
        onclick,
    }: Props = $props();

    const variants: Record<Variant, string> = {
        orange: 'bg-orange-600 hover:bg-orange-700 text-white',
        white: 'bg-white hover:bg-gray-100 text-orange-600 shadow',
    };
</script>

<button
        type="button"
        {disabled}
        onclick={onclick}
        class={[
    'font-bold py-2 px-4 rounded-lg cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
  ]}
        aria-label={alt}
>
    <span class="w-6 h-6">
        <slot />
    </span>
</button>