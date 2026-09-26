import type { OEmbed } from "$lib/reddit/schema/oEmbedSchema";
import type { Post } from "$lib/reddit/schema/postSchema";
import type { Variant } from "$lib/reddit/Media";
import Streamable from "./Streamable";
import RedGif from "./RedGif";
import Imgur, { isImgurUrl } from "./Imgur";
import { env } from "$env/dynamic/private";

type Fetch = typeof window.fetch;
export type OembedProvider = (fetch : Fetch, oembed: OEmbed) => Promise<Variant[]>;

const OembedProviders = {
  'Streamable': Streamable,
  'RedGIFs': RedGif,
} satisfies Record<string, OembedProvider>;

const ALLOWED_PROVIDERS = (env.ALLOW_OEMBED ?? '').split(',').map(provider => provider.trim()).filter(Boolean);

type ProviderName = keyof typeof OembedProviders;

function isAllowed(name: string): boolean {
  if (ALLOWED_PROVIDERS.includes(name))
    return true;

  console.warn(`Third-party provider "${name}" is not allowed. Must be: ${ALLOWED_PROVIDERS.join(', ')}`);
  return false;
}

/** Gets the name of the provider that will handle the oembed, if it is supported and allowed. */
export function getOembedProvider(oembed: OEmbed): ProviderName | undefined {
  if (!oembed.provider_name || !(oembed.provider_name in OembedProviders))
    return undefined;

  return isAllowed(oembed.provider_name) ? oembed.provider_name as ProviderName : undefined;
}

export async function fetchOembedVariants(fetch : Fetch, oembed: OEmbed): Promise<Variant[]> {
  const name = getOembedProvider(oembed);
  if (!name)
    return [];

  return await OembedProviders[name](fetch, oembed);
}

/** Gets the imgur link of the post, if it has one and the provider is allowed. */
export function getImgurUrl(post: Post): URL | undefined {
  const url = URL.parse(post.url ?? '');
  return url && isImgurUrl(url) && isAllowed('Imgur') ? url : undefined;
}

export async function fetchImgurVariants(fetch: Fetch, url: URL): Promise<Variant[]> {
  return await Imgur(fetch, url);
}
