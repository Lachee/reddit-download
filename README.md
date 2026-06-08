# Reddit Download
Download reddit media without the faff. 

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
The live site is available at [dl-reddit.com](dl-reddit.com), running everything here on this repo. 
You can download any posts by going to `dl-reddit.com/r/subreddit/post`.

> Just add `dl-` to the front of any reddit link!

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
