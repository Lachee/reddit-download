
export function normalizePermalink(input: string): string {
  const url = input.trim();

  if (url.startsWith('http')) {
    const match = url.match(/\/?(r\/.+)$/);
    return match?.[1] ?? url;
  }

  return url
    .replace(/^\/+/, '')
    .replace(/^(?!r\/)/, 'r/');
}