import { z } from 'zod';
import mediaMetadataItemSchema from "$lib/reddit/schema/mediaMetadataItemSchema";

const commentSchema = z.object({
  id: z.string(),
  name: z.string(),

  author: z.string().nullable().optional(),
  body: z.string().optional(),
  permalink: z.string(),
  score: z.number().optional(),

  media_metadata: z.record(z.string(), mediaMetadataItemSchema).nullable().optional(),
}).loose();

export default commentSchema;
export type Comment = z.infer<typeof commentSchema>;
