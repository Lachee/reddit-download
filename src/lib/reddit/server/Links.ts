/** List of domains that are allowed to be followed. */
const REDDIT_DOMAINS = [
  'reddit.com',
  'redd.it',
  'redditstatic.com',
  'redditmedia.com',
];

/** Follows the shortened links */
export async function follow(fetch : typeof window.fetch, href: string): Promise<URL> {
  const url = validateUrl(href.trim(), REDDIT_DOMAINS);
  if (url === null)
    throw new Error('cannot follow an invalid URL');

  const shareLinkRegex = /reddit.com\/r\/\w*\/s\//
  if (shareLinkRegex.test(url.toString())) {
    console.log(`Following shorthand: ${url.toString()}`);
    const response = await fetch(`${url.origin}${url.pathname}`, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
      }
    });

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
