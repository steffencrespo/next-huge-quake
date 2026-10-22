import { workflow } from '@outputai/core';
import quakeNews from '../quake_news/workflow.js';
import quakePublish from '../quake_publish/workflow.js';
import { buildSpec, checkFastTrackNarration, clock, generateNarration, prepareTerrain, renderVideo } from './steps.js';
import { videoWorkflowOutputSchema, workflowInputSchemaVideo } from './types.js';
import type { StageRecord, VideoWorkflowOutput } from './types.js';

type Stage = StageRecord['name'];

/** Temporal wraps a step failure ("Activity task failed"); the useful message is on the innermost cause. */
const rootMessage = ( error: unknown ): string => {
  let current = error as { message?: string; cause?: unknown } | undefined;
  while ( current?.cause && typeof current.cause === 'object' ) {
    current = current.cause as { message?: string; cause?: unknown };
  }
  return current?.message ?? String( error );
};

/**
 * USGS event -> validated news -> VideoSpec -> narration -> terrain -> MP4, ready for human approval. Nothing is
 * published. The M1 workflow runs unchanged as a child and its validation gate is the only way in: a failed
 * validation, a rejected package or no event stops here and no video stage runs. The workflow does no I/O and reads
 * no clock; every duration is measured inside a step.
 *
 * One video per USGS event: start it with workflowId `quake_video-<eventId>`. Temporal then rejects a second start while
 * that run is in progress; after it finishes a repeat starts a new run, which reuses the existing narration instead of
 * paying ElevenLabs again. A later USGS update to the same event would need a new version of the video (a new ID).
 */
export default workflow( {
  name: 'quake_video',
  description: 'Fetch a USGS earthquake, produce validated news, then narration, captions and a rendered 35 s video ready for approval',
  inputSchema: workflowInputSchemaVideo,
  outputSchema: videoWorkflowOutputSchema,
  fn: async ( input ): Promise<VideoWorkflowOutput> => {
    const stages: StageRecord[] = [];
    const begin = ( await clock() ).ms;
    const totalMs = async () => ( await clock() ).ms - begin;

    const newsStart = begin;
    const news = await quakeNews( input );
    const newsMs = ( await clock() ).ms - newsStart;
    stages.push( { name: 'quake_news', status: 'ok', ms: newsMs, detail: null } );

    if ( news.status === 'no_candidate' ) {
      return { status: 'no_candidate', reason: news.reason, stages, totalMs: await totalMs() };
    }
    const result = news.videoPackage;
    if ( !result || result.status === 'rejected' ) {
      return { status: 'rejected', reason: result?.reason ?? 'quake_news returned no video package', stages, totalMs: await totalMs() };
    }
    const eventId = result.package.event.id;

    const fail = async ( failedStage: Stage, error: unknown ): Promise<VideoWorkflowOutput> => {
      stages.push( { name: failedStage, status: 'failed', ms: 0, detail: null } );
      return { status: 'failed', eventId, failedStage, error: rootMessage( error ), stages, totalMs: await totalMs() };
    };
    const record = ( name: Stage, r: { ms: number; detail: string | null } ) =>
      stages.push( { name, status: r.detail?.startsWith( 'reused' ) ? 'skipped' : 'ok', ms: r.ms, detail: r.detail } );

    let built, narration, render;
    try {
      built = await buildSpec( { videoPackage: result.package } );
      record( 'build_spec', built );
    } catch ( error ) {
      return fail( 'build_spec', error );
    }
    try {
      if ( input.fastTrack ) {
        // Fail closed: the fast-track budget assumes a bounded narration length; refuse before the paid request.
        await checkFastTrackNarration( { eventId, narration: result.package.narration } );
      }
      narration = await generateNarration( { eventId, narration: result.package.narration } );
      record( 'narration', narration );
    } catch ( error ) {
      return fail( 'narration', error );
    }
    try {
      record( 'terrain', await prepareTerrain( { eventId } ) );
    } catch ( error ) {
      return fail( 'terrain', error );
    }
    try {
      render = await renderVideo( { eventId } );
      record( 'render', render );
    } catch ( error ) {
      return fail( 'render', error );
    }

    const outputs = {
      package: built.package,
      spec: built.spec,
      script: built.script,
      narration: narration.narration,
      soundtrack: narration.soundtrack,
      mp4: render.mp4,
      credits: render.credits
    };
    // Fast Track: the policy decides on fresh USGS data. A refusal or failure leaves this run ready for approval.
    let fastTrack;
    if ( input.fastTrack ) {
      const timing = {
        detectedAtUtc: input.fastTrack.detectedAtUtc,
        productionStartedAtUtc: new Date( begin ).toISOString(),
        renderCompletedAtUtc: new Date( ( await clock() ).ms ).toISOString()
      };
      try {
        fastTrack = await quakePublish( { eventId, produced: result.package.event, narration: result.package.narration, credits: render.credits, mp4: render.mp4, timing } );
      } catch ( error ) {
        const none = { originToDetectionMs: null, detectionToProductionMs: null, productionToRenderMs: null, renderToUploadMs: null, uploadToPublicMs: null, originToPublicMs: null };
        fastTrack = { status: 'failed' as const, eventId, manifestId: null, videoId: null, tier: null, reasons: [ `quake_publish: ${rootMessage( error )}` ], timestamps: {}, latency: none };
      }
    }

    return {
      status: 'ready_for_approval',
      eventId,
      outputs,
      news: news.draft,
      ...( fastTrack ? { fastTrack } : {} ),
      stages,
      totalMs: await totalMs()
    };
  },
  options: { activityOptions: { retry: { maximumAttempts: 1 } } }
} );
