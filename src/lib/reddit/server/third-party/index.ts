import type { OEmbed } from "$lib/reddit/schema/oEmbedSchema";
import type { Variant } from "$lib/reddit/server/Media";

import Streamable from "./Streamable";

type Fetch = typeof window.fetch;
export type OembedProvider = (fetch : Fetch, oembed: OEmbed) => Promise<Variant[]>;

const OembedProviders = {
  'Streamable': Streamable,
} satisfies Record<string, OembedProvider>;

export async function fetchOembedVariants(fetch : Fetch, oembed: OEmbed): Promise<Variant[]> {
  if (!oembed.provider_name || !(oembed.provider_name in OembedProviders))
    return [];

  const provider = OembedProviders[oembed.provider_name as keyof typeof OembedProviders];
  return await provider(fetch, oembed);
}
