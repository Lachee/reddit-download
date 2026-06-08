import { z } from 'zod';

const galleryDataItemSchema = z.object({
  caption: z.string().optional(),
  media_id: z.string(),
  is_deleted: z.boolean(),
  id: z.number(),
})

const galleryDataSchema = z.object({
  items: z.array(galleryDataItemSchema),
})

export default galleryDataSchema;
export type GalleryData = z.infer<typeof galleryDataSchema>;