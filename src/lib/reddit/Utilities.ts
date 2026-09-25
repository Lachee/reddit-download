export const PERMALINK_ROOTS = [ 'r', 'user', 'u' ] as const;
const PERMALINK_PATH = new RegExp(`/((?:${PERMALINK_ROOTS.join('|')})/.+)$`, 'i');
const USER_PERMALINK = /^(?:user|u)\/([^/]+)(\/.*)?$/i;
const COMMENTS_PERMALINK = /(\/comments\/[a-z0-9]+)(?:\/comment\/([a-z0-9]+)|\/[^/]+\/([a-z0-9]+))?(?:\/.*)?$/i;
const COMMENT_ID = /\/comment\/([a-z0-9]+)\/$/i;

/** Normalizes the permalink into a r/ form, stripping unnessary information. */
export function normalizePermalink(rawPermalink: string): string {
  let permalink = rawPermalink.trim().replace(/[?#].*$/, '');

  // - strip the origin
  if (permalink.startsWith('http')) {
    const match = permalink.match(PERMALINK_PATH);
    if (match === null)
      return permalink;
    permalink = match[1];
  }

  // - strip leading slashes
  permalink = permalink.replace(/^\/+/, '');

  // - strip leading title  // - strip leading title
  permalink = permalink.replace(COMMENTS_PERMALINK, (_, post: string, comment?: string, legacyComment?: string) => {
    const id = comment ?? legacyComment;
    return id ? `${post}/comment/${id}/` : `${post}/`;
  });

  // - canonicalise users
  const user = permalink.match(USER_PERMALINK);
  if (user !== null)
    permalink = `r/u_${user[1]}${user[2] ?? ''}`;

  // - prefix and suffix
  permalink = permalink.replace(/^(?!r\/)/, 'r/');
  if (!permalink.endsWith('/'))
    permalink += '/';

  return permalink;
}

/** Normalizes the reddit permalink into a form the media access */
export function normalizeMedialink(rawPermalink: string): string {
  return normalizePermalink(rawPermalink).substring(2);
}

/** Gets the id of the comment the permalink points to, if any. */
export function getCommentId(rawPermalink: string): string | undefined {
  return normalizePermalink(rawPermalink).match(COMMENT_ID)?.[1];
}
