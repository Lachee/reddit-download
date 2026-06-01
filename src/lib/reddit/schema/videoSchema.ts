import { z } from 'zod';

const videoSchema = z.object({
  bitrate_kbps: z.number().nullable().optional(),
  fallback_url: z.url().optional(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),

  scrubber_media_url: z.url().optional(),
  dash_url: z.url().optional(),
  hls_url: z.url().optional(),

  duration: z.number().optional(),
  is_gif: z.boolean().optional(),
  transcoding_status: z.string().optional(),
}).loose();
export default videoSchema;
export type Video = z.infer<typeof videoSchema>;
