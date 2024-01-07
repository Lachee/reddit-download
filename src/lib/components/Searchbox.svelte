<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { swipe } from "svelte-gestures";
  import { fade, slide } from "svelte/transition";

  export let value: string = "";
  export let placeholder: string = "placeholder";
  export let label: string = "Search";
  export let icon: boolean = false;

  const dispatch = createEventDispatcher();

  function click() {
    dispatch("click", { value });
  }

  function clear() {
    value = "";
    dispatch("clear", { value });
  }
</script>

<div class="relative">
  {#if icon}
    <div
      class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none"
    >
      <svg
        class="w-4 h-4 text-gray-500 dark:text-gray-400"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
        />
      </svg>
    </div>
  {/if}
  <input
    type="search"
    id="default-search"
    class="input block w-full p-4 text-sm"
    class:ps-10={icon}
    {placeholder}
    required
    bind:value
    use:swipe={{ timeframe: 300, minSwipeDistance: 100 }}
    on:swipe={(evt) => {
      if (evt.detail.direction === "left") clear();
    }}
  />
  <button
    on:click={click}
    class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >{label}</button
  >
</div>

<div class="h-1 mt-0 p-0" style="margin-top: 5px">
  {#if value.length > 0}
    <span transition:fade class="text-gray-600 italic m-0 p-0"
      >swipe left to clear</span
    >{/if}
</div>
