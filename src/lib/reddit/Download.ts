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

/** Gets the extension the media is served as. */
export function getExtension(response: Response): string {
  const mime = response.headers.get('Content-Type') ?? '';
  return mime.split('/')[1] ?? '';
}


/** Creates a link and downloads it */
export function download(href: string){
  const a = document.createElement('a');
  a.href = href;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
