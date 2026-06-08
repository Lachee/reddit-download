import type { OEmbed } from "$lib/reddit/schema/oEmbedSchema";
import type { Variant } from "$lib/reddit/Media";
import Streamable from "./Streamable";
import RedGif from "./RedGif";
import { env } from "$env/dynamic/private";

type Fetch = typeof window.fetch;
export type OembedProvider = (fetch : Fetch, oembed: OEmbed) => Promise<Variant[]>;

const OembedProviders = {
  'Streamable': Streamable,
  'RedGIFs': RedGif,
} satisfies Record<string, OembedProvider>;

const ALLOWED_PROVIDERS = (env.ALLOW_OEMBED ?? '').split(',').map(provider => provider.trim()).filter(Boolean);

export async function fetchOembedVariants(fetch : Fetch, oembed: OEmbed): Promise<Variant[]> {
  if (!oembed.provider_name || !(oembed.provider_name in OembedProviders))
    return [];

  if (!ALLOWED_PROVIDERS.includes(oembed.provider_name)) {
    console.warn(`Oembed provider "${oembed.provider_name}" is not allowed. Must be: ${ALLOWED_PROVIDERS.join(', ')}`);
    return [];
  }

  const provider = OembedProviders[oembed.provider_name as keyof typeof OembedProviders];
  return await provider(fetch, oembed);
}
