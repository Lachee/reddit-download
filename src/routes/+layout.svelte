<script>
  import "../app.pcss";
  // Your selected Skeleton theme:
  //import "@skeletonlabs/skeleton/themes/theme-skeleton.css";
  //import "@skeletonlabs/skeleton/themes/theme-gold-nouveau.css";

  // This contains the bulk of Skeletons required styles:
  //import "@skeletonlabs/skeleton/styles/skeleton.css";

  // Finally, your application's global stylesheet (sometimes labeled 'app.css')
  import { AppShell } from "@skeletonlabs/skeleton";
  import Footer from "$lib/components/Footer.svelte";
</script>

<AppShell>
  <slot />
  <svelte:fragment slot="pageFooter">
    <div class="container mx-auto p-8 space-y-8">
      <!--<Footer />-->
    </div>
  </svelte:fragment>
</AppShell>
