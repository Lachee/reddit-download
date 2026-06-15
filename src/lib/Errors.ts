
export const StatusMessages : { [key : number] : { title: string, message: string } } = {
  400: { title: 'Bad Request', message: 'The request was invalid or cannot be otherwise served.' },
  401: { title: 'Unauthorized', message: 'You do not have permission to perform this action.' },
  403: { title: 'Forbidden', message: 'You do not have permission to access this resource.' },
  404: { title: 'Not Found', message: 'The requested resource could not be found.' },
  405: { title: 'Method Not Allowed', message: 'The method specified in the request is not allowed for the resource.' },
  408: { title: 'Request Timeout', message: 'The server timed out waiting for the request.' },
  429: { title: 'Too Many Requests', message: 'You have sent too many requests in a given amount of time.' },
  451: { title: 'Unavailable For Legal Reasons', message: 'The server is denying access to the resource' },
  500: { title: 'Internal Server Error', message: 'An unexpected error occurred.' },
  503: { title: 'Service Unavailable', message: 'The server is currently unavailable.' },
  504: { title: 'Gateway Timeout', message: 'The server timed out while waiting for a response.' },
  520: { title: 'Unknown Error', message: 'An unknown error occurred.' },

}

export const NOT_FOUND = 'NOT_FOUND';
export const DENY_NSFW = 'DENY_NSFW';
export const DENY_SUBREDDIT = 'DENY_SUBREDDIT';
export const DENY_YOUTUBE = 'DENY_YOUTUBE';

export const ErrorMessages : { [key : string] : { title: string, message: string } } = {
  [NOT_FOUND]: { title: 'Not Found', message: 'The post cannot be found.' },
  [DENY_NSFW]: { title: 'NSFW Content', message: 'This post is marked NSFW which is banned from this site.' },
  [DENY_SUBREDDIT]: { title: 'Subreddit Banned', message: 'The subreddit this post is from has been banned from this site.' },
  [DENY_YOUTUBE]: { title: 'Cannot download YouTube', message: 'This site isn\'t yt-dl and cannot download this post.' },
}