import { z } from '@outputai/core';
import { quakeFactsSchema } from '../quake_news/types.js';

const level = z.enum( [ 'green', 'yellow', 'orange', 'red' ] ).nullable();

export const pagerImpactSchema = z.object( {
  fatalityLevel: level,
  economicLevel: level,
  exposedMmi6Plus: z.number().nullable(),
  maxMmi: z.number().nullable()
} );

export const timingSchema = z.object( {
  detectedAtUtc: z.string().nullable().describe( 'When the monitor first saw the event (null when started by hand)' ),
  productionStartedAtUtc: z.string(),
  renderCompletedAtUtc: z.string()
} );

export const publishInputSchema = z.object( {
  eventId: z.string(),
  produced: quakeFactsSchema.describe( 'The USGS facts the video was produced from' ),
  narration: z.string().describe( 'The validated narration in the video' ),
  credits: z.string().describe( 'Absolute path of the render credits file' ),
  mp4: z.string().describe( 'Absolute path of the rendered MP4' ),
  timing: timingSchema
} );

export const gateOutputSchema = z.object( {
  publish: z.boolean(),
  tier: z.string(),
  signals: z.array( z.string() ),
  reasons: z.array( z.string() ),
  finalPrivacy: z.enum( [ 'private', 'public' ] ),
  facts: quakeFactsSchema.nullable(),
  impact: pagerImpactSchema.nullable(),
  evaluatedAtUtc: z.string()
} );

export const latencySchema = z.object( {
  originToDetectionMs: z.number().nullable(),
  detectionToProductionMs: z.number().nullable(),
  productionToRenderMs: z.number().nullable(),
  renderToUploadMs: z.number().nullable(),
  uploadToPublicMs: z.number().nullable(),
  originToPublicMs: z.number().nullable()
} );

export const publishOutputSchema = z.object( {
  status: z.enum( [ 'published', 'verified_private', 'manual', 'failed' ] ),
  eventId: z.string(),
  manifestId: z.string().nullable(),
  videoId: z.string().nullable(),
  tier: z.string().nullable(),
  reasons: z.array( z.string() ).describe( 'Why the event went to a person, or what failed' ),
  timestamps: z.record( z.string(), z.string().nullable() ),
  latency: latencySchema
} );

export type PublishInput = z.infer<typeof publishInputSchema>;
export type GateOutput = z.infer<typeof gateOutputSchema>;
export type PublishOutput = z.infer<typeof publishOutputSchema>;
export type Latency = z.infer<typeof latencySchema>;
