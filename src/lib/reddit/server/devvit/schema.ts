import { z } from 'zod';

/*
 * The JSON the dltool Devvit app responds with from /external/lookup.
 * It is Devvit's Post.toJSON() (+ gallery) and Comment.toJSON(), see devvit/src/server/lookup.ts.
 * Devvit drops undefined fields and may send nulls, so everything not required is nullish.
 */

const devvitVideoSchema = z.object({
  bitrateKbps:       z.number().nullish(),
  dashUrl:           z.string().nullish(),
  duration:          z.number().nullish(),
  fallbackUrl:       z.string().nullish(),
  height:            z.number().nullish(),
  hlsUrl:            z.string().nullish(),
  isGif:             z.boolean().nullish(),
  scrubberMediaUrl:  z.string().nullish(),
  transcodingStatus: z.string().nullish(),
  width:             z.number().nullish(),
}).loose();

const devvitOembedSchema = z.object({
  type:            z.string().nullish(),
  version:         z.string().nullish(),
  title:           z.string().nullish(),
  authorName:      z.string().nullish(),
  authorUrl:       z.string().nullish(),
  providerName:    z.string().nullish(),
  providerUrl:     z.string().nullish(),
  thumbnailUrl:    z.string().nullish(),
  thumbnailWidth:  z.number().nullish(),
  thumbnailHeight: z.number().nullish(),
  html:            z.string().nullish(),
  width:           z.number().nullish(),
  height:          z.number().nullish(),
}).loose();

const devvitSecureMediaSchema = z.object({
  type:        z.string().nullish(),
  oembed:      devvitOembedSchema.nullish(),
  redditVideo: devvitVideoSchema.nullish(),
}).loose();

const devvitGalleryMediaSchema = z.object({
  url:    z.string(),
  width:  z.number(),
  height: z.number(),
  /** GalleryMediaStatus: 0 unknown, 1 valid, 2 failed. Might arrive as the enum name. */
  status: z.union([ z.number(), z.string() ]).nullish(),
}).loose();

const devvitPostSchema = z.object({
  id:                z.string(),
  authorName:        z.string().nullish(),
  subredditName:     z.string(),
  permalink:         z.string(),
  title:             z.string(),
  body:              z.string().nullish(),
  url:               z.string(),
  thumbnail:         z.object({ url: z.string(), width: z.number(), height: z.number() }).nullish(),
  createdAt:         z.union([ z.string(), z.number() ]),
  score:             z.number().nullish(),
  numberOfComments:  z.number().nullish(),
  nsfw:              z.boolean().nullish(),
  spoiler:           z.boolean().nullish(),
  locked:            z.boolean().nullish(),
  archived:          z.boolean().nullish(),
  stickied:          z.boolean().nullish(),
  secureMedia:       devvitSecureMediaSchema.nullish(),
  gallery:           z.array(devvitGalleryMediaSchema).nullish(),
  crosspostParentId: z.string().nullish(),
}).loose();

const devvitCommentSchema = z.object({
  id:         z.string(),
  postId:     z.string().nullish(),
  authorName: z.string().nullish(),
  body:       z.string().nullish(),
  permalink:  z.string(),
  score:      z.number().nullish(),
}).loose();

export const lookupResponseSchema = z.object({
  post:            devvitPostSchema,
  crosspostParent: devvitPostSchema.nullish(),
  comment:         devvitCommentSchema.nullish(),
}).loose();

export const lookupErrorSchema = z.object({
  error: z.string(),
}).loose();

export type DevvitVideo = z.infer<typeof devvitVideoSchema>;
export type DevvitOembed = z.infer<typeof devvitOembedSchema>;
export type DevvitSecureMedia = z.infer<typeof devvitSecureMediaSchema>;
export type DevvitGalleryMedia = z.infer<typeof devvitGalleryMediaSchema>;
export type DevvitPost = z.infer<typeof devvitPostSchema>;
export type DevvitComment = z.infer<typeof devvitCommentSchema>;
export type LookupResponse = z.infer<typeof lookupResponseSchema>;
