import type { Handle } from '@sveltejs/kit';
import { detectAgent, track } from '$lib/server/Analytics';

// LLMs do not run the tracker script, so they have to be counted server side.
export const handle: Handle = async ({ event, resolve }) => {
  const agent = detectAgent(event.url, event.request);
  if (agent)
    track('agent', { name: agent.name, declared: agent.declared }, {
      url:     event.url,
      request: event.request,
      address: event.getClientAddress(),
    });

  return resolve(event);
};
