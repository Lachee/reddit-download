import { z } from 'zod';

const oEmbedSchema = z.object({
  type: z.string().optional(),
  version: z.string().optional(),

  title: z.string().optional(),
  author_name: z.string().optional(),
  author_url: z.url().optional(),

  provider_name: z.string().optional(),
  provider_url: z.url().optional(),

  thumbnail_url: z.url().optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_height: z.number().optional(),

  html: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
}).loose();
export default oEmbedSchema;
export type OEmbed = z.infer<typeof oEmbedSchema>;
