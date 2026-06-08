import { z } from 'zod';

const Arrayable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)])
    .transform((value) => Array.isArray(value) ? value : [value]);

const OptionalArrayable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)])
    .optional()
    .transform((value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    });

const NumberStringSchema = z.union([z.string(), z.number()])
  .transform((value) => Number(value));

const StringNumberSchema = z.union([z.string(), z.number()])
  .transform((value) => String(value));

const MpdDurationSchema = z.string().regex(
  /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  'Invalid ISO 8601 duration'
);

export const MpdBaseUrlSchema = z.union([
  z.string(),
  z.object({
    '#text': z.string().optional(),
    '@_serviceLocation': z.string().optional(),
    '@_byteRange': z.string().optional(),
    '@_availabilityTimeOffset': z.string().optional(),
    '@_availabilityTimeComplete': z.string().optional(),
  }).loose(),
]).transform((value) => {
  if (typeof value === 'string') return value;
  return value['#text'] ?? '';
});

export const MpdSegmentUrlSchema = z.object({
  '@_media': z.string().optional(),
  '@_mediaRange': z.string().optional(),
  '@_index': z.string().optional(),
  '@_indexRange': z.string().optional(),
}).loose();

export const MpdSegmentTimelineItemSchema = z.object({
  '@_t': NumberStringSchema.optional(),
  '@_d': NumberStringSchema,
  '@_r': NumberStringSchema.optional(),
}).loose();

export const MpdSegmentTimelineSchema = z.object({
  S: Arrayable(MpdSegmentTimelineItemSchema),
}).loose();

export const MpdInitializationSchema = z.object({
  '@_sourceURL': z.string().optional(),
  '@_range': z.string().optional(),
}).loose();

export const MpdSegmentBaseSchema = z.object({
  Initialization: MpdInitializationSchema.optional(),

  '@_timescale': NumberStringSchema.optional(),
  '@_presentationTimeOffset': NumberStringSchema.optional(),
  '@_indexRange': z.string().optional(),
  '@_indexRangeExact': z.union([z.string(), z.boolean()]).optional(),
  '@_availabilityTimeOffset': z.string().optional(),
  '@_availabilityTimeComplete': z.string().optional(),
}).loose();

export const MpdSegmentListSchema = z.object({
  Initialization: MpdInitializationSchema.optional(),
  SegmentTimeline: MpdSegmentTimelineSchema.optional(),
  SegmentURL: OptionalArrayable(MpdSegmentUrlSchema),

  '@_timescale': NumberStringSchema.optional(),
  '@_duration': NumberStringSchema.optional(),
  '@_startNumber': NumberStringSchema.optional(),
  '@_presentationTimeOffset': NumberStringSchema.optional(),
}).loose();

export const MpdSegmentTemplateSchema = z.object({
  Initialization: MpdInitializationSchema.optional(),
  SegmentTimeline: MpdSegmentTimelineSchema.optional(),

  '@_media': z.string().optional(),
  '@_initialization': z.string().optional(),
  '@_index': z.string().optional(),
  '@_bitstreamSwitching': z.string().optional(),

  '@_timescale': NumberStringSchema.optional(),
  '@_duration': NumberStringSchema.optional(),
  '@_startNumber': NumberStringSchema.optional(),
  '@_endNumber': NumberStringSchema.optional(),
  '@_presentationTimeOffset': NumberStringSchema.optional(),
  '@_availabilityTimeOffset': z.string().optional(),
  '@_availabilityTimeComplete': z.string().optional(),
}).loose();

export const MpdContentProtectionSchema = z.object({
  '@_schemeIdUri': z.string().optional(),
  '@_value': z.string().optional(),
  '@_id': z.string().optional(),
  '@_default_KID': z.string().optional(),

  // Common Widevine / PlayReady fields depending on XML parser namespace handling.
  'cenc:pssh': z.string().optional(),
  'mspr:pro': z.string().optional(),
}).loose();

export const MpdRoleSchema = z.object({
  '@_schemeIdUri': z.string().optional(),
  '@_value': z.string().optional(),
}).loose();

export const MpdEssentialPropertySchema = z.object({
  '@_schemeIdUri': z.string().optional(),
  '@_value': z.string().optional(),
}).loose();

export const MpdRepresentationSchema = z.object({
  BaseURL: OptionalArrayable(MpdBaseUrlSchema),
  SegmentBase: MpdSegmentBaseSchema.optional(),
  SegmentList: MpdSegmentListSchema.optional(),
  SegmentTemplate: MpdSegmentTemplateSchema.optional(),
  ContentProtection: OptionalArrayable(MpdContentProtectionSchema),
  EssentialProperty: OptionalArrayable(MpdEssentialPropertySchema),
  SupplementalProperty: OptionalArrayable(MpdEssentialPropertySchema),

  '@_id': StringNumberSchema.optional(),
  '@_mimeType': z.string().optional(),
  '@_codecs': z.string().optional(),
  '@_bandwidth': NumberStringSchema.optional(),

  '@_width': NumberStringSchema.optional(),
  '@_height': NumberStringSchema.optional(),
  '@_frameRate': z.string().optional(),
  '@_sar': z.string().optional(),

  '@_audioSamplingRate': NumberStringSchema.optional(),
  '@_numChannels': NumberStringSchema.optional(),

  '@_startWithSAP': NumberStringSchema.optional(),
  '@_scanType': z.string().optional(),
}).loose();

export const MpdAdaptationSetSchema = z.object({
  BaseURL: OptionalArrayable(MpdBaseUrlSchema),
  Representation: OptionalArrayable(MpdRepresentationSchema),
  SegmentBase: MpdSegmentBaseSchema.optional(),
  SegmentList: MpdSegmentListSchema.optional(),
  SegmentTemplate: MpdSegmentTemplateSchema.optional(),
  ContentProtection: OptionalArrayable(MpdContentProtectionSchema),
  Role: OptionalArrayable(MpdRoleSchema),
  EssentialProperty: OptionalArrayable(MpdEssentialPropertySchema),
  SupplementalProperty: OptionalArrayable(MpdEssentialPropertySchema),

  '@_id': StringNumberSchema.optional(),
  '@_group': StringNumberSchema.optional(),
  '@_lang': z.string().optional(),

  '@_contentType': z.string().optional(),
  '@_mimeType': z.string().optional(),
  '@_codecs': z.string().optional(),

  '@_width': NumberStringSchema.optional(),
  '@_height': NumberStringSchema.optional(),
  '@_minBandwidth': NumberStringSchema.optional(),
  '@_maxBandwidth': NumberStringSchema.optional(),
  '@_minWidth': NumberStringSchema.optional(),
  '@_maxWidth': NumberStringSchema.optional(),
  '@_minHeight': NumberStringSchema.optional(),
  '@_maxHeight': NumberStringSchema.optional(),
  '@_frameRate': z.string().optional(),

  '@_audioSamplingRate': NumberStringSchema.optional(),
  '@_segmentAlignment': z.union([z.string(), z.boolean(), z.number()]).optional(),
  '@_startWithSAP': NumberStringSchema.optional(),
}).loose();

export const MpdPeriodSchema = z.object({
  BaseURL: OptionalArrayable(MpdBaseUrlSchema),
  AdaptationSet: OptionalArrayable(MpdAdaptationSetSchema),
  SegmentBase: MpdSegmentBaseSchema.optional(),
  SegmentList: MpdSegmentListSchema.optional(),
  SegmentTemplate: MpdSegmentTemplateSchema.optional(),

  '@_id': StringNumberSchema.optional(),
  '@_start': MpdDurationSchema.optional(),
  '@_duration': MpdDurationSchema.optional(),
  '@_bitstreamSwitching': z.union([z.string(), z.boolean()]).optional(),
}).loose();

export const MpdDocumentSchema = z.object({
  MPD: z.object({
    BaseURL: OptionalArrayable(MpdBaseUrlSchema),
    Period: OptionalArrayable(MpdPeriodSchema),

    '@_xmlns': z.string().optional(),
    '@_xmlns:cenc': z.string().optional(),
    '@_xmlns:mspr': z.string().optional(),

    '@_id': z.string().optional(),
    '@_profiles': z.string().optional(),
    '@_type': z.enum(['static', 'dynamic']).optional(),

    '@_mediaPresentationDuration': MpdDurationSchema.optional(),
    '@_minimumUpdatePeriod': MpdDurationSchema.optional(),
    '@_minBufferTime': MpdDurationSchema.optional(),
    '@_timeShiftBufferDepth': MpdDurationSchema.optional(),
    '@_suggestedPresentationDelay': MpdDurationSchema.optional(),
    '@_maxSegmentDuration': MpdDurationSchema.optional(),
    '@_maxSubsegmentDuration': MpdDurationSchema.optional(),

    '@_availabilityStartTime': z.string().optional(),
    '@_availabilityEndTime': z.string().optional(),
    '@_publishTime': z.string().optional(),
  }).loose(),
}).loose();

export default MpdDocumentSchema;
export type MpdDocument = z.infer<typeof MpdDocumentSchema>;
export type MpdPeriod = z.infer<typeof MpdPeriodSchema>;
export type MpdAdaptationSet = z.infer<typeof MpdAdaptationSetSchema>;
export type MpdRepresentation = z.infer<typeof MpdRepresentationSchema>;