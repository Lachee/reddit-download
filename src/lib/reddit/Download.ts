import { type Media, sort, VariantType } from "$lib/reddit/Media";

/** Gets the endpoint that serves the best available version of the media. */
export function getDownloadLink(permalink: string, media: Media, asGif = false): string {
  const variant = sort(media.variants)[0];
  if (asGif || variant.type === VariantType.GIF)
    return `/g/${permalink}?m=${media.id}&s=best`;
  if (variant.type === VariantType.Video || variant.type === VariantType.PartialVideo || variant.type === VariantType.PartialAudio)
    return `/v/${permalink}?m=${media.id}&s=best`;
  return `/i/${permalink}?m=${media.id}&s=best`;
}

/** Gets the name the server wants the media saved as. */
export function getFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition') ?? '';
  return disposition.match(/filename="(.+?)"/)?.[1] ?? fallback;
}

/** Gets the extension the media is served as. */
export function getExtension(response: Response): string {
  const mime = response.headers.get('Content-Type') ?? '';
  return mime.split('/')[1] ?? '';
}

/** Fetches the media then prompts the browser to save it. */
export async function download(href: string, fallback: string) {
  const response = await fetch(href);
  if (!response.ok)
    return;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = getFilename(response, fallback);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
