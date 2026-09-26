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

type ProviderName = keyof typeof OembedProviders;

/** Gets the name of the provider that will handle the oembed, if it is supported and allowed. */
export function getOembedProvider(oembed: OEmbed): ProviderName | undefined {
  if (!oembed.provider_name || !(oembed.provider_name in OembedProviders))
    return undefined;

  if (!ALLOWED_PROVIDERS.includes(oembed.provider_name)) {
    console.warn(`Oembed provider "${oembed.provider_name}" is not allowed. Must be: ${ALLOWED_PROVIDERS.join(', ')}`);
    return undefined;
  }

  return oembed.provider_name as ProviderName;
}

export async function fetchOembedVariants(fetch : Fetch, oembed: OEmbed): Promise<Variant[]> {
  const name = getOembedProvider(oembed);
  if (!name)
    return [];

  return await OembedProviders[name](fetch, oembed);
}
