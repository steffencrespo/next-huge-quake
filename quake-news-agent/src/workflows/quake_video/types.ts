import { z } from '@outputai/core';
import { videoPackageSchema, workflowInputSchema } from '../quake_news/types.js';

export const STAGES = [ 'quake_news', 'build_spec', 'narration', 'terrain', 'render' ] as const;

export const workflowInputSchemaVideo = workflowInputSchema.extend( {
  asOfUtc: z.iso.datetime().describe( 'When the video is produced for (ISO 8601 UTC). Supplied by the caller; the workflow never reads the clock.' )
} );

export const stageSchema = z.object( {
  name: z.enum( STAGES ),
  status: z.enum( [ 'ok', 'skipped', 'failed' ] ),
  ms: z.number().describe( 'Wall time of the stage in milliseconds' ),
  detail: z.string().nullable().describe( 'For example "reused existing narration"' )
} );

export const outputPathsSchema = z.object( {
  package: z.string(),
  spec: z.string(),
  script: z.string(),
  narration: z.string(),
  soundtrack: z.string(),
  mp4: z.string(),
  credits: z.string()
} );

const common = { stages: z.array( stageSchema ), totalMs: z.number() };

export const videoWorkflowOutputSchema = z.discriminatedUnion( 'status', [
  z.object( {
    status: z.literal( 'ready_for_approval' ),
    eventId: z.string(),
    outputs: outputPathsSchema,
    news: z.object( { headline: z.string(), dek: z.string(), article: z.string(), narration: z.string() } )
      .describe( 'The validated M1 text, for the editor. Nothing has been published.' ),
    ...common
  } ),
  z.object( { status: z.literal( 'no_candidate' ), reason: z.string(), ...common } ),
  z.object( {
    status: z.literal( 'rejected' ),
    reason: z.string().describe( 'Why no video was made (failed validation, deleted event, ...). No draft content is included.' ),
    ...common
  } ),
  z.object( {
    status: z.literal( 'failed' ),
    eventId: z.string(),
    failedStage: z.enum( STAGES ),
    error: z.string(),
    ...common
  } )
] );

export const stepResultSchema = z.object( { ms: z.number(), detail: z.string().nullable() } );

export const buildSpecInputSchema = z.object( { videoPackage: videoPackageSchema } );
export const buildSpecOutputSchema = stepResultSchema.extend( { package: z.string(), spec: z.string(), script: z.string() } );
export const eventStepInputSchema = z.object( { eventId: z.string(), narration: z.string().optional() } );
export const narrationOutputSchema = stepResultSchema.extend( { narration: z.string(), soundtrack: z.string() } );
export const renderOutputSchema = stepResultSchema.extend( { mp4: z.string(), credits: z.string() } );

export type VideoWorkflowInput = z.infer<typeof workflowInputSchemaVideo>;
export type VideoWorkflowOutput = z.infer<typeof videoWorkflowOutputSchema>;
export type StageRecord = z.infer<typeof stageSchema>;
export type OutputPaths = z.infer<typeof outputPathsSchema>;
