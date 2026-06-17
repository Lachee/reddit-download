
export function normalizePermalink(input: string): string {
  const url = input.trim();

  if (url.startsWith('http')) {
    const match = url.match(/\/?(r\/.+)$/);
    return match?.[1] ?? url;
  }

  let permalink = url
    .replace(/^\/+/, '')
    .replace(/^(?!r\/)/, 'r/');

  if (!permalink.endsWith('/'))
    permalink += '/';

  return permalink;
}