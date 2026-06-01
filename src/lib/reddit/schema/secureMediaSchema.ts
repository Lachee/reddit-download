import { z } from 'zod';
import oEmbedSchema from "$lib/reddit/schema/oEmbedSchema";
import videoSchema from "$lib/reddit/schema/videoSchema";

const secureMediaSchema = z.object({
  type: z.string().optional(),

  reddit_video: videoSchema.optional(),

  oembed: oEmbedSchema.optional(),
}).loose();

export default secureMediaSchema;
export type SecureMedia = z.infer<typeof secureMediaSchema>;
