import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const trailingSlash = 'always';

export const load: LayoutServerLoad = async ({ setHeaders, params, fetch }) => {
  return {
    umami: env.UMAMI_HOST && env.UMAMI_WEBSITE_ID ? { host: env.UMAMI_HOST, website: env.UMAMI_WEBSITE_ID } : undefined
  };
};
