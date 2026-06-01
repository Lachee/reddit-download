import { z } from 'zod';

const previewImageSchema = z.object({
  source: z.object({
    url: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  resolutions: z.array(z.object({
    url: z.string(),
    width: z.number(),
    height: z.number(),
  })).optional(),
}).loose();

export default previewImageSchema;
export type PreviewImage = z.infer<typeof previewImageSchema>;