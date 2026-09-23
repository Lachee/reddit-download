import { env } from '$env/dynamic/private';
import type { EventData } from '$lib/Analytics';

type Visitor = {
  url: URL,
  request: Request,
  address: string,
};

/** Sends an event to umami as the visitor who caused it, never failing the request that triggered it. */
export function track(event: string, data: EventData, visitor: Visitor): void {
  if (!env.UMAMI_HOST || !env.UMAMI_WEBSITE_ID)
    return;

  const payload = {
    website:  env.UMAMI_WEBSITE_ID,
    hostname: visitor.url.hostname,
    url:      visitor.url.pathname + visitor.url.search,
    referrer: visitor.request.headers.get('Referer') ?? '',
    language: visitor.request.headers.get('Accept-Language')?.split(',')[0] ?? '',
    name:     event,
    data,
  };

  fetch(`${env.UMAMI_HOST.replace(/\/$/, '')}/api/send`, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      // Umami rejects requests without an agent, and uses it to identify the visitor.
      'User-Agent':      visitor.request.headers.get('User-Agent') ?? 'reddit-download',
      'X-Forwarded-For': visitor.address,
    },
    body:    JSON.stringify({ type: 'event', payload }),
  })
    .then(response => response.ok || console.warn('[analytics] failed to track', event, response.status))
    .catch(error => console.warn('[analytics] failed to track', event, error));
}
