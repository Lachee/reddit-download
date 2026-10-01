import type { RequestHandler } from './$types';
import { resolveGif, type CachedGif } from "$lib/server/Gif";
import { range } from "$lib/server/Range";
import { redirect } from "@sveltejs/kit";
import { query } from "$lib/reddit/server";
import { track } from "$lib/server/Analytics";

// Ignored so a trailing .gif is not redirected to .gif/, which would defeat the point of it.
export const trailingSlash = 'ignore';

/** Clients like Discord only treat a link as a gif when the path ends in .gif, so it is optionally accepted. */
const GIF_EXTENSION = /\.gif\/?$/i;

export const GET: RequestHandler = async ({ url, params, fetch, request, getClientAddress }) => {
  // Return the cached response if it exists / is currently being processed
  const mediaId = url.searchParams.get('media') ?? url.searchParams.get('m') ?? false;
  const { post, collection, permalink } = await query({ permalink: params.permalink.replace(GIF_EXTENSION, '/'), fetch });

  let cached: CachedGif;
  const result = await resolveGif({ post, collection, permalink, mediaId, fetch });
  if ('body' in result) {
    result.done.then(({ content }) => track('gif-convert', {
      subreddit: post.subreddit ?? '',
      duration:  Math.round(result.duration),
      scale:     result.size,
      bytes:     content.byteLength,
    }, { url, request, address: getClientAddress() })).catch(() => {});

    // Stream the gif as it is encoded. Ranges need the whole gif, so they wait for it to finish instead.
    if (!request.headers.has('range')) {
      return new Response(result.body, {
        headers: {
          "Content-Type":        result.mime,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control":       "public, max-age=3600",
        },
      });
    }

    result.body.cancel();
    cached = await result.done;
  } else {
    cached = result;
  }

  if ('redirect' in cached)
    throw redirect(308, cached.redirect);

  // Prepare the content and try to do a range for iOS playback
  let content = cached.content;
  let status = cached.status;
  let headers: Record<string, string> = {
    "Content-Type":        cached.mime,
    "Content-Disposition": `attachment; filename="${cached.filename}"`,
    "Cache-Control":       "public, max-age=3600",
  }

  if (cached.error)
    headers['X-Error'] = cached.error;

  const slice = range(request, cached.content);
  if (slice) {
    content = slice.slice;
    status = slice.status;
    headers = {
      ...headers,
      ...slice.headers,
    }
  }

  return new Response(content, { status, headers });
}
