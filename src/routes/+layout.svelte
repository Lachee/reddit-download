<script>
  // Your selected Skeleton theme:
  //import "@skeletonlabs/skeleton/themes/theme-skeleton.css";
  import "@skeletonlabs/skeleton/themes/theme-gold-nouveau.css";

  // This contains the bulk of Skeletons required styles:
  import "@skeletonlabs/skeleton/styles/skeleton.css";

  // Finally, your application's global stylesheet (sometimes labeled 'app.css')
  import "../app.postcss";
  import { AppShell } from "@skeletonlabs/skeleton";
</script>

<AppShell>
  <slot />
  <svelte:fragment slot="pageFooter"
    ><div class="p-4">🏳️‍⚧️ Created by Lachee in 2023</div></svelte:fragment
  >
</AppShell>
