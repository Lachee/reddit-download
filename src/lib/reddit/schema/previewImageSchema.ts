import { z } from 'zod';

const sourceSchema = z.object({
  url:    z.string(),
  width:  z.number(),
  height: z.number(),
})

const variantSchema = z.object({
  source: sourceSchema,
  resolutions: z.array(sourceSchema),
})

const previewImageSchema = variantSchema.safeExtend({
  variants: z.looseObject({
    gif: variantSchema.optional(),
    mp4: variantSchema.optional(),
  }),
  id:  z.string(),
})

export default previewImageSchema;
export type PreviewImage = z.infer<typeof previewImageSchema>;
export type PreviewImageVariant = z.infer<typeof variantSchema>;