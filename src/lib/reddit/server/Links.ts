/** List of domains that are allowed to be followed. */
const REDDIT_DOMAINS = [
  'reddit.com',
  'redd.it',
  'redditstatic.com',
  'redditmedia.com',
];

/** Finds the first reddit link in some shared text. Returns an empty string when there is none. */
export function extractRedditUrl(text: string): string {
  const match = text.match(/https?:\/\/(?:[a-z]+\.)?(?:reddit\.com\/(?:r|user|u)|redd\.it)\/[^\s]+/i);
  return match?.[0] ?? '';
}

/** Follows the shortened links */
export async function follow(fetch : typeof window.fetch, href: string): Promise<URL> {
  const url = validateUrl(href.trim(), REDDIT_DOMAINS);
  if (url === null)
    throw new Error('cannot follow an invalid URL');

  // redd.it/<id> short links only redirect to /comments/<id>, which is enough to fetch the post.
  const shortLink = url.hostname.match(/^(?:www\.)?redd\.it$/i) && url.pathname.match(/^\/([a-z0-9]+)\/?$/i);
  if (shortLink)
    return new URL(`/comments/${shortLink[1]}/`, 'https://www.reddit.com');

  const shareLinkRegex = /reddit\.com\/(?:r|user|u)\/[^/]+\/s\//i
  if (shareLinkRegex.test(url.toString())) {
    console.log(`[reddit] resolving share link ${url.pathname}`);
    const response = await fetch(`${url.origin}${url.pathname}`, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
      }
    });

    console.log(`[reddit] share link ${url.pathname} resolved to ${response.url} (${response.status})`);
    return await follow(fetch, response.url);
  }

  return url;
}

/**
 * Validates if the string is a URL object and returns a new URL object if it is.
 * If the href is just a relative basename like /r/..., then a new reddit link is created.
 * @param href the URL to validate
 * @param allowedRoots Domains the url can be from.
 */
function validateUrl(href: string, allowedRoots: string[]): URL | null {
  try {
    let url : URL;
    if (href.startsWith('http'))
      url = new URL(href);
    else
      url = new URL(href, 'https://www.reddit.com');

    const root = rootHostname(url);
    if (allowedRoots.includes(root))
      return url;

  } catch (_) {
    // Ignoring any errors that are caused by creating invalid href.
  }

  return null;
}

/**
 * Gets the root level domain from the given url
 * @param url the URL to get the root domain off
 * @returns
 */
function rootHostname(url: string | URL): string {
  if (typeof url === 'string') url = new URL(url);
  return url.hostname.split('.').reverse().splice(0, 2).reverse().join('.');
}
