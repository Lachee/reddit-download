import { env } from '$env/dynamic/private';
import type { EventData } from '$lib/Analytics';

type Visitor = {
  url: URL,
  request: Request,
  address: string,
};

/** Agents that identify themselves in the user agent, matched case-insensitively. */
const KNOWN_AGENTS = [
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'Anthropic-AI',
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Gemini', 'Google-Extended', 'GoogleOther',
  'meta-externalagent', 'MistralAI-User', 'DuckAssistBot', 'cohere-ai',
  'Bytespider', 'Amazonbot', 'Applebot-Extended', 'CCBot', 'YouBot',
];

/** Keeps a self declared name short and boring, so it cannot pollute the reports. */
function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ._-]/g, '').trim().slice(0, 40);
}

/** Identifies an LLM either by the agent it declares, or by a user agent we recognise. */
export function detectAgent(url: URL, request: Request): { name: string, declared: boolean } | undefined {
  const declared = sanitize(url.searchParams.get('agent') ?? '');
  if (declared)
    return { name: declared, declared: true };

  const userAgent = (request.headers.get('User-Agent') ?? '').toLowerCase();
  const known = KNOWN_AGENTS.find(agent => userAgent.includes(agent.toLowerCase()));

  return known ? { name: known.toLowerCase(), declared: false } : undefined;
}

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
