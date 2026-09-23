export type EventData = Record<string, string | number | boolean>;

export const Events = {
  DisplayMode: 'display-mode',
  GifPreview: 'gif-preview',
  Download: 'download',
  DownloadAll: 'download-all',
  Pwa: 'pwa',
} as const;

export type Format = 'gif' | 'video' | 'image';

export function track(event: string, data: EventData = {}) {
  window.umami?.track(event, data);
}

/** Tracks an event once per session, repeating only if the data changes. */
export function trackOnce(key: string, event: string, data: EventData = {}) {
  const value = JSON.stringify(data);
  try {
    if (sessionStorage.getItem(key) === value)
      return;
    sessionStorage.setItem(key, value);
  } catch {
    return;
  }

  track(event, data);
}

export function getFormat(href: string): Format {
  if (href.startsWith('/g/'))
    return 'gif';
  if (href.startsWith('/v/'))
    return 'video';
  return 'image';
}
