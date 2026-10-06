import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, getServerPort, reddit } from '@devvit/web/server';
import { lookup, LookupError } from './lookup';

/** Lookups are tiny ({ postId, commentId }), anything bigger is not for us. */
const MAX_BODY_BYTES = 4 * 1024;

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES)
      throw new LookupError(413, 'Request body is too large.');
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new LookupError(400, 'Request body is not valid JSON.');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const path = (req.url ?? '').replace(/\?.*$/, '');
  try {
    if (path !== '/external/lookup')
      return send(res, 404, { error: `No route for ${path}.` });

    if (req.method !== 'POST')
      return send(res, 405, { error: 'Use POST.' });

    send(res, 200, await lookup(reddit, await readJson(req)));
  } catch (err) {
    if (err instanceof LookupError)
      return send(res, err.status, { error: err.message });

    console.error(`[lookup] ${req.method} ${path} failed:`, err);
    send(res, 502, { error: err instanceof Error ? err.message : 'Reddit lookup failed.' });
  }
});

server.on('error', (err) => console.error('[server] error:', err));
server.listen(getServerPort());
