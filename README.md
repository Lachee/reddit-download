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

## Live Site
The live site is available at [dl-reddit.com](https://dl-reddit.com), running everything here on this repo. 
You can download any posts by going to `dl-reddit.com/r/subreddit/post`.

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
| `ALLOW_NSFW` | if `true`, then NSFW posts can be downloaded | `'true'` or `'false'`  |
| `ALLOW_EOMBED` | A comma-separated list of allowed oembed providers | `'Streamable,RedGIFs'` |

As for the cache, there are numerous options available:


| Environment Variable | Description                                        | Example                       |
| --- |----------------------------------------------------|-------------------------------|
| `CACHE_STORE` | The type of cache to be used                       | `none`, `memory`, `file`, `redis` |
| `CACHE_POST_TTL` | Duration of the post cache in seconds              | `604800`                              | 
| `CACHE_VIDEO_TTL` | Duration of the video cache in seconds             | `604800`                            |
| `CACHE_GIF_TTL` | Duration of the gif cache in seconds               | `604800`                             |
| `CACHE_IMAGE_TTL` | Duration of the image cache in seconds             | `604800`        |
| `REDIS_URL` | A comma-separated list of allowed oembed providers | `'Streamable,RedGIFs'`        |
| `FILE_CACHE_DIR` | A comma-separated list of allowed oembed providers | `'Streamable,RedGIFs'`        |
