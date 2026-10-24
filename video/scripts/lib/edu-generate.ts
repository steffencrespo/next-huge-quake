import { InvalidAudioError, NarrationTooLongError } from '../../src/audio/tts.js';
import type { Speech } from '../../src/audio/tts.js';

export type LedgerEntry = { at: string; episode: string; line: string; key: string; characters: number; status?: 'rejected'; durationSeconds?: number; reason?: string };

/** Slowest observed pace in the narration library (about the 5th percentile, 131 clips): 12 characters per second. */
export const ESTIMATE_CHARS_PER_SECOND = 12;

export const estimateClipSeconds = ( characters: number ) => characters / ESTIMATE_CHARS_PER_SECOND;

/** Fails before any paid request when a line to be generated is likely to run over the clip limit. Never rewrites or splits text. */
export function preflightLines( lines: { id: string; text: string; characters: number }[], limitSeconds: number ) {
  const long = lines.filter( l => estimateClipSeconds( l.characters ) > limitSeconds );
  if ( long.length > 0 ) {
    throw new Error( `narration preflight: ${ long.map( l => `'${ l.id }' (${ l.characters } characters, estimated ${ estimateClipSeconds( l.characters ).toFixed( 1 ) } s)` ).join( ', ' ) } likely over the ${ limitSeconds } s clip limit at ${ ESTIMATE_CHARS_PER_SECOND } characters per second; shorten the line before generating. No request was made.` );
  }
}

export type GenerateLineDeps = {
  episode: string;
  line: { id: string; text: string };
  key: string;
  characters: number;
  budget: number;
  limitSeconds: number;
  spent: () => number;
  record: ( entry: LedgerEntry ) => void;
  request: ( text: string, limitSeconds: number ) => Promise<Speech>;
  save: ( speech: Speech ) => void;
};

/**
 * Budget check, one paid request, then the ledger. Audio that came back but is unusable (over the clip limit, or invalid alignment) is still a paid
 * request: it is recorded as 'rejected' (and so counts against the budget) before the error is rethrown. Nothing is saved then.
 */
export async function generateLine( d: GenerateLineDeps ): Promise<Speech> {
  if ( d.spent() + d.characters > d.budget ) {
    throw new Error( `budget: ${ d.spent() } credits already spent, '${ d.line.id }' needs ${ d.characters } more, over ${ d.budget }. Stopping.` );
  }
  const entry = { at: new Date().toISOString(), episode: d.episode, line: d.line.id, key: d.key, characters: d.characters };
  let speech: Speech;
  try {
    speech = await d.request( d.line.text, d.limitSeconds );
  } catch ( error ) {
    if ( error instanceof NarrationTooLongError ) {
      d.record( { ...entry, status: 'rejected', durationSeconds: error.speech.durationSeconds } );
    }
    if ( error instanceof InvalidAudioError ) {
      d.record( { ...entry, status: 'rejected', reason: error.message } );
    }
    throw error;
  }
  d.save( speech );
  d.record( entry );
  return speech;
}
