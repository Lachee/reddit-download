import { z } from 'zod';

const mediaMetadataItemSchema = z.object({
  status: z.string().optional(),
  e: z.string().optional(),
  m: z.string().optional(),
  p: z.array(z.object({
    y: z.number().optional(),
    x: z.number().optional(),
    u: z.string().optional(),
  }).loose()).optional(),
  s: z.object({
    y: z.number().optional(),
    x: z.number().optional(),
    u: z.string().optional(),
    gif: z.string().optional(),
    mp4: z.string().optional(),
  }).loose().optional(),
}).loose();

export default mediaMetadataItemSchema;
export type MediaMetadataItem = z.infer<typeof mediaMetadataItemSchema>;