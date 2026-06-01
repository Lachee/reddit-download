import { z } from 'zod';
import previewImageSchema from "$lib/reddit/schema/previewImageSchema";
import mediaMetadataItemSchema from "$lib/reddit/schema/mediaMetadataItemSchema";
import secureMediaSchema from "$lib/reddit/schema/secureMediaSchema";
import videoSchema from "$lib/reddit/schema/videoSchema";

const postSchema =  z.object({
  id: z.string(),
  name: z.string(), // e.g. t3_asg4dn
  kind: z.literal('t3').optional(),

  title: z.string(),
  author: z.string().nullable().optional(),
  subreddit: z.string(),
  subreddit_name_prefixed: z.string().optional(),

  permalink: z.string(),
  url: z.string().optional(),
  domain: z.string().optional(),

  selftext: z.string().optional(),
  selftext_html: z.string().nullable().optional(),

  ups: z.number().optional(),
  downs: z.number().optional(),
  score: z.number().optional(),
  upvote_ratio: z.number().optional(),

  num_comments: z.number().optional(),

  created: z.number().optional(),
  created_utc: z.number(),

  over_18: z.boolean().optional(),
  spoiler: z.boolean().optional(),
  locked: z.boolean().optional(),
  archived: z.boolean().optional(),
  stickied: z.boolean().optional(),
  is_self: z.boolean().optional(),
  is_video: z.boolean().optional(),

  thumbnail: z.string().optional(),
  post_hint: z.string().optional(),

  preview: z.object({
    images: z.array(previewImageSchema).optional(),
    reddit_video_preview: videoSchema.optional(),
    enabled: z.boolean().optional(),
  }).loose().optional(),

  media: z.unknown().nullable().optional(),
  secure_media: secureMediaSchema.nullable().optional(),
  media_metadata: z.record(z.string(), mediaMetadataItemSchema).optional(),

  gallery_data: z.object({
    items: z.array(z.object({
      media_id: z.string(),
      id: z.number().optional(),
    }).loose()),
  }).loose().optional(),

  crosspost_parent: z.string().optional(),
  crosspost_parent_list: z.array(z.unknown()).optional(),
}).loose();

export default postSchema;
export type Post = z.infer<typeof postSchema>;