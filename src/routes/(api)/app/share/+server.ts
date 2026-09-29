import type { RequestHandler } from './$types';
import { isHttpError, json } from '@sveltejs/kit';
import { query } from '$lib/reddit/server';
import { extractRedditUrl } from '$lib/reddit/server/Links';
import { findBiggestVariant, findPresentedMedia, VariantType } from '$lib/reddit/Media';
import { getDownloadLink } from '$lib/reddit/Download';
import { normalizeMedialink } from '$lib/reddit/Utilities';
import { getFormat } from '$lib/Analytics';
import { track } from '$lib/server/Analytics';

/** Area (px²) of the thumbnails. Big enough to stay crisp on a retina phone grid. */
const THUMBNAIL_AREA = 640 * 640;

/**
 * Lists the downloadable media of a shared post for the iOS app's share sheet.
 * @query-param url The shared reddit link. Short links (redd.it, /s/) are followed.
 * @query-param text Shared text containing the reddit link, used when there is no url.
 */
export const GET: RequestHandler = async ({ url, fetch, request, getClientAddress }) => {
  const link = extractRedditUrl(url.searchParams.get('url') || url.searchParams.get('text') || '');

  track('share', { source: 'app', resolved: link !== '' }, {
    url,
    request,
    address: getClientAddress(),
  });

  if (!link)
    return json({ error: 'Share a link to a reddit post.' }, { status: 400 });

  try {
    const { post, comment, collection, permalink } = await query({ permalink: link, fetch });
    const medialink = normalizeMedialink(permalink);
    return json({
      id:        post.id,
      title:     post.title,
      subreddit: post.subreddit_name_prefixed ?? `r/${post.subreddit}`,
      author:    comment?.author ?? post.author ?? '[deleted]',
      over_18:   post.over_18 ?? false,
      permalink,
      media:     findPresentedMedia(collection).map(m => {
        const download = getDownloadLink(medialink, m);
        const dimension = findBiggestVariant(m.variants.filter(v => v.type !== VariantType.PartialAudio))?.dimension;
        return {
          id:        m.id,
          kind:      getFormat(download),
          width:     dimension?.width,
          height:    dimension?.height,
          thumbnail: new URL(`/i/${medialink}?m=${m.id}&s=${THUMBNAIL_AREA}`, url).href,
          download:  new URL(download, url).href,
        };
      }),
    });
  } catch (err) {
    if (isHttpError(err))
      return json({ error: err.body.message }, { status: err.status });
    throw err;
  }
};
