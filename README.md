# Reddit Download
Download reddit media without the faff. 

[dl-reddit.com](https://dl-reddit.com/)

This tool will allow you to download any video, image, or gif from Reddit without the hassle of the app or following links.
It will remerge secure video, generate gifs, handle third-party oembeds, and more:

- Download videos
  - Downloads streamed media and merges audio/video streams
- Download gifs
  - Converts videos into gifs if none is provided
- Download images
  - Always the biggest quality
  - All images from a gallery 
- Download Streamable, and more
  - Handles oembed content
  - Shows full resolution videos when possible
- Self Hosted
- Complete OpenGraph for Discord

<img width="800" height="388" alt="firefox_gcomfdh9sN-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/c22c90bf-4981-4322-822f-6b0ca2dc2156" />


## Live Site
The live site is available at [dl-reddit.com](https://dl-reddit.com), running everything here on this repo. 
You can download any posts by going to `dl-reddit.com/r/subreddit/post`.

> [!TIP]  
> Just add `dl-` to the front of any reddit link!

Some examples can be found in `TEST-POSTS.md`:

| Reddit URL | DL URL |
| --- | --- |
| [r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/](https://www.reddit.com/r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/) | [dl-reddit.com/r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/](https://dl-reddit.com/r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/) |
| [r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/](https://www.reddit.com/r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/) | [dl-reddit.com/r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/](https://dl-reddit.com/r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/) |
| [r/ffxiv/comments/124meh9/microwaved_lalashark/](https://www.reddit.com/r/ffxiv/comments/124meh9/microwaved_lalashark/) | [dl-reddit.com/r/ffxiv/comments/124meh9/microwaved_lalashark/](https://dl-reddit.com/r/ffxiv/comments/124meh9/microwaved_lalashark/) |
| [r/rupaulsdragrace/comments/1ty81bn/i_need_old_untucked_back - ](https://www.reddit.com/r/rupaulsdragrace/comments/1ty81bn/) | [dl-reddit.com/r/rupaulsdragrace/comments/1ty81bn/i_need_old_untucked_back - ](https://dl-reddit.com/r/rupaulsdragrace/comments/1ty81bn/i_need_old_untucked_back) |

<img width="1371" height="1273" alt="firefox_rKeSdBXPap" src="https://github.com/user-attachments/assets/375eb28b-6db0-4ab9-a645-d6287de4cd6f" />

## Self Hosting
There is a docker container available for self hosting. I encourage self-hosted versions for speed, privacy, and control.
The setup is simple:
```shell
docker run --rm -d \
  --env-file .env \
  -p 3000:3000  \
  -v /mnt/user/appdata/dl-reddit:/cache
  ghcr.io/lachee/reddit-download:latest
```

### Configuration
There is a provided `sample.env` that can be used to base your configuration off.
Firstly there are the reddit related configuration:

| Environment Variable | Description | Example                |
| --- | --- |------------------------|
| `REDDIT_CLIENT_ID` | Your Reddit client ID | -                      |
| `REDDIT_CLIENT_SECRET` | Your Reddit client secret | -                      | 
| `REDDIT_USERNAME` | Your Reddit username | -                      |
| `REDDIT_PASSWORD` | Your Reddit password | -                      |
| `DEVVIT_URL` | Optional: the external URL of your Devvit app install. When set (with `DEVVIT_TOKEN`), posts are read through Devvit instead of the `REDDIT_*` account. See [Reading posts through Devvit](#reading-posts-through-devvit-experimental) | `https://dltool-2th52-external.devvit.net` |
| `DEVVIT_TOKEN` | Optional: a managed Devvit app token | `devvit_at_...` |
| `ALLOW_NSFW` | Allows NSFW posts from being looked up.  | `'true'` or `'false'`  |
| `ALLOW_OEMBED` | A comma-separated list of allowed oembed providers. Any that are not lisited will be excluded from "valid variants" and not be downloadable. | `'Streamable,RedGIFs'` |
| `DENY_SUBREDDITS` | A comma-seperated list of banned subreddits. Lookup of posts on these subreddits will be blocked | `'aiArt,generativeAI'` |
| `UMAMI_HOST` | Optional: The host of your [Umami](https://umami.is/) instance | `https://umami.lachee.dev` |
| `UMAMI_WEBSITE_ID` | Optional: ID of your [Umami](https://umami.is/) website | `9eede8e5-1e15-4e2c-b400-7d5fa10b06ef` |

> [!IMPORTANT]  
> **Why do i need to give my password?!**
> 
> This seems daft, and quite frankly it is very stupid. But as of May 2026, Reddit has blocked all access to .json endpoints without authorization.
> 
> The easiest way to get authorization, is to make yourself a "application" and act as a bot user. The application will get authorization tokens from reddit using your username+password, then use that token until it expires. **This is just how reddit does it.** Why can't it use the app secret? 🤷 i don't know.


As for the cache, there are numerous options available:


| Environment Variable | Description                                        | Example                      |
| --- |----------------------------------------------------|------------------------------|
| `CACHE_STORE` | The type of cache to be used                       | `none`, `memory`, `file`, `redis` |
| `CACHE_POST_TTL` | Duration of the post cache in seconds              | `604800`                             | 
| `CACHE_VIDEO_TTL` | Duration of the video cache in seconds             | `604800`                           |
| `CACHE_GIF_TTL` | Duration of the gif cache in seconds               | `604800`                            |
| `CACHE_IMAGE_TTL` | Duration of the image cache in seconds             | `604800`       |
| `CACHE_GC_RATE`  | How often should the cache run its cleanup. Not applicable for Redis. |  `3600` | 
| `REDIS_URL` | If using the `redis` cache, the URL for the server | `redis://localhost:6379/0`       |
| `FILE_CACHE_DIR` | If using the `file` cache, directory to store the cached data. | `/cache`       |

> [!NOTE]  
> The docker container does **not** include a Redis server. You must provide your own.


## Making a "Application": How to get a CLIENT_ID 
Reddit has made things more difficult, as always. They have hidden the old way of making apps and now expect developers to make a "game" or some other wacky contraption for reddit. 
So to make an app, we must use old reddit.
1. Go to [old.reddit.com/prefs/apps/](https://old.reddit.com/prefs/apps/)
2. Press "create another app..."
  - name: What you want to call it, doesnt matter
  - Make it a `script`: This will only use the developer account.
  - Description: `Fetches information about gifs`
  - About url: `https://github.com/lachee/reddit-download`
  - Redirect uri: `https://github.com/lachee/reddit-download` (this isnt used)
3. Copy the secret and the client id
4. Optional: Add a user as a developer. See Making a "Bot Account"

With the client id and secret, you place them into your `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`. The `REDDIT_USERNAME` needs to be one of the developers, and the `REDDIT_PASSWORD` must match.

> [!NOTE]
> I was having issues with special character passwords and accounts associated with Google.
> Its recommended to make a new bot account just for this.

## Making a "Bot" account:
This process is just the normal flow on reddit. Make an account with a username and password. **DO NOT** sign in with Google.
There are some settings you need to tweak however to make sure reddit responds with the correct thumbnails and previews. Once again, we need old reddit to edit these settings 🙄

Go to [old.reddit.com/prefs/](https://old.reddit.com/prefs/) and change:
- Thumbnails: 🔘 Show thumbnails next to links
- Media Previews: 🔘 Expand media previews based on that subreddit's media preference
- Reddit Video Player: ☑ Autoplay reddit videos
- NSFW Content: ☐ Hide images for NSFW/18+ content (obviously keep this enabled if you dont want NSFW).
- ...
- Content Options:
  - ☑ show mature (18+) content
  - ☑ include mature content in search results
  - ☑ enable private rss feed

### Age Verification
> [!IMPORTANT]  
> **Australian, UK, and other "age-restricted" countries**
>
> If you are a country listed in [reddits help article](https://support.reddithelp.com/hc/en-us/articles/36429514849428-Why-is-Reddit-asking-for-my-age) you will need to verify this account's age before it can download NSFW content.
> This is rather annoying to do, and Reddit doesnt make it obvious how to do this.
>
> To verify: go to any NSFW post and follow the prompts. 
>
> 

## Reading posts through Devvit (experimental)
Instead of a script app and a bot account's password, the site can read posts through a [Devvit](https://developers.reddit.com) app.
The app lives in `devvit/`. It has one [external endpoint](https://developers.reddit.com/docs/capabilities/server/external-endpoints), `POST /external/lookup`, which reads a post (and comment) with `reddit.getPostById()` as the app's own account and returns it.
The site calls it with a managed app token and converts the result back into the shape the `.json` endpoint gives.

```
dl-reddit server --(bearer devvit_at_...)--> https://dltool-<subreddit id>-external.devvit.net/external/lookup --> reddit.getPostById()
```

### What it can and can't read
This is from reading the Devvit SDK (0.14.7). It has not been checked against the live API yet.
- **Public posts in any subreddit**, not only the one the app is installed in. `getPostById()` is a plain `/api/info` lookup with no subreddit filter.
- **Not private subreddits.** The app reads as its own account (`u/dltool`), never as you. Devvit only lets an app act as the user to submit posts and comments or subscribe, so a private subreddit is readable only if the app account itself is approved there.
- **Less media than the `.json` endpoint.** Devvit's post model keeps the reddit video DASH manifest, oEmbed, thumbnail and the full size gallery items, but drops the preview resolutions, the mp4 versions of gifs, `reddit_video_preview` and comment `media_metadata`.
  - Videos, Streamable/RedGIFs and comment videos are unaffected.
  - Images and galleries only have their full size version.
  - Gif posts only have the gif, not the mp4 (`tests/devvit.test.ts` snapshots show what each test post ends up with).
  - Comment images are read from the links in the comment's body instead.
- External endpoints are rate limited (5 requests per second at the time of writing), so keep `CACHE_STORE` enabled.

### Setup
1. Request access to External Endpoints. It needs Reddit's approval: [request form](https://docs.google.com/forms/d/e/1FAIpQLScLU2m-IH9xtt4hqFBNy5AlrswY0pvfvoyTiQREbq_9xDQJkQ/viewform).
2. Log in and upload the app. The app name in `devvit/devvit.json` must be one your account owns. Rename it if `dltool` is taken.
   ```shell
   cd devvit
   npm install
   npx devvit login   # add --copy-paste on a machine without a browser
   npm run deploy     # builds and runs devvit upload
   ```
3. Install it on a subreddit you moderate, eg your own test subreddit: `npx devvit install <subreddit>`. It does not need to be the subreddit you download from.
4. In the [developer settings](https://developers.reddit.com), create a managed **App Token** and copy the `devvit_at_...` secret. It is shown only once.
5. Find the subreddit's id. Open `https://www.reddit.com/r/<subreddit>/about.json` while logged in and take `name` without the `t5_` prefix, eg `t5_2th52` is `2th52`.
6. Set the site's environment:
   ```shell
   DEVVIT_URL=https://dltool-2th52-external.devvit.net
   DEVVIT_TOKEN=devvit_at_...
   ```
   The `REDDIT_*` variables are then unused. Share links (`/s/...`) are still resolved by asking reddit.com for the redirect.

Check it works with:
```shell
curl -X POST "$DEVVIT_URL/external/lookup" \
  -H "Authorization: bearer $DEVVIT_TOKEN" -H "Content-Type: application/json" \
  -d '{"postId":"1ty68vr"}'
```
`npx devvit logs <subreddit>` shows the app's logs.

The app's own checks are `npm run check`, `npm test` and `npm run build` in `devvit/`.

## Testing
The tests in `tests/posts.test.ts` run each post from `TEST-POSTS.md` through the same path as the site (search bar → `query()` → media collection) and compare the result against a snapshot.
They replay Reddit responses recorded in `tests/fixtures/`, so they run offline and need no credentials.
`tests/devvit.test.ts` runs the same posts with `DEVVIT_URL` set. There are no recordings of the Devvit app yet, so its responses are simulated from the same recordings.

```shell
pnpm test
```

### Adding a new test
1. Add the post URL to `POSTS` in `tests/posts.test.ts`, and to `TEST-POSTS.md` with a note on what it covers.
2. Record it from Reddit. This needs the Reddit credentials in your `.env`. The `-t` filter only records tests whose URL matches, so the others are left alone:
   ```shell
   pnpm test:record -t 1abcdef
   ```
3. Check the new entry in `tests/__snapshots__/posts.test.ts.snap` is what the page should show (the media, their type, and the best variant).
4. Commit the new file in `tests/fixtures/` along with the snapshot.

### When Reddit changes
`pnpm test:record` fetches every post live and compares it against the existing snapshots, so a failure means Reddit now responds differently.
Once you have fixed the code (or confirmed the change is fine), accept the new results with `pnpm test:record -u`.
A deleted post keeps working from its recording in `pnpm test`, but re-recording it captures the deleted version. Replace it with a live post that covers the same case.
