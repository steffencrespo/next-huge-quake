/**
 * ElevenLabs text-to-speech with character-level timestamps.
 *
 * Endpoint: POST {baseUrl}/v1/text-to-speech/{voice_id}/with-timestamps, header `xi-api-key`, JSON body
 * { text, model_id }. The response has `audio_base64` and `alignment` (original text) plus `normalized_alignment`.
 * The ElevenLabs docs do not say which model IDs the with-timestamps endpoint accepts, so the model is explicit
 * configuration with no default, and an API rejection is reported with the provider's message.
 *
 * Credentials come from the environment (or video/.env.local, which is git-ignored). The key is never logged, printed
 * or put in an error message.
 */
import { z } from 'zod';
import { alignmentToCaptions, validateAlignment } from './captions.js';
import type { Alignment } from './captions.js';
import { mp3DurationSeconds } from './mp3.js';
import type { Caption } from './soundtrack.js';

export const VIDEO_SECONDS = 35;
export const NARRATION_START_SECONDS = 1.5;
/** Time after the voice for the music swell and the 2 s fade-out (see MIX in soundtrack.ts). */
export const END_MARGIN_SECONDS = 3;
export const MAX_NARRATION_SECONDS = VIDEO_SECONDS - NARRATION_START_SECONDS - END_MARGIN_SECONDS;
export const OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_BASE_URL = 'https://api.elevenlabs.io';

export type TtsConfig = { apiKey: string; voiceId: string; modelId: string; baseUrl?: string };

const REQUIRED = [ 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_MODEL_ID' ] as const;

/** Reads the three required settings; names every missing one (never a value). */
export function loadTtsConfig( env: Record<string, string | undefined> ): TtsConfig {
  const missing = REQUIRED.filter( name => !env[name]?.trim() );
  if ( missing.length > 0 ) {
    throw new Error( `missing ElevenLabs configuration: ${missing.join( ', ' )} (set in the environment or video/.env.local)` );
  }
  return { apiKey: env.ELEVENLABS_API_KEY!.trim(), voiceId: env.ELEVENLABS_VOICE_ID!.trim(), modelId: env.ELEVENLABS_MODEL_ID!.trim() };
}

/** Parses KEY=VALUE lines (comments and blank lines ignored, optional quotes). */
export function parseEnvFile( text: string ): Record<string, string> {
  const out: Record<string, string> = {};
  for ( const line of text.split( '\n' ) ) {
    const match = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/ );
    if ( match && !line.trim().startsWith( '#' ) ) {
      out[match[1]] = match[2].replace( /^(['"])(.*)\1$/, '$2' );
    }
  }
  return out;
}

const responseSchema = z.object( { audio_base64: z.string().min( 1 ), alignment: z.unknown() } );

export type Speech = { mp3: Uint8Array; alignment: Alignment; durationSeconds: number; captions: Caption[] };

/**
 * Generates the narration for `text` (sent unchanged), checks the alignment against it, measures the real audio
 * duration and rejects audio that cannot fit the video. Never truncates or speeds up audio.
 */
export async function generateSpeech( text: string, config: TtsConfig, fetchFn: typeof fetch = fetch ): Promise<Speech> {
  const url = `${config.baseUrl ?? DEFAULT_BASE_URL}/v1/text-to-speech/${encodeURIComponent( config.voiceId )}/with-timestamps?output_format=${OUTPUT_FORMAT}`;
  let response: Response;
  try {
    response = await fetchFn( url, {
      method: 'POST',
      headers: { 'xi-api-key': config.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify( { text, model_id: config.modelId } )
    } );
  } catch ( error ) {
    throw new Error( `ElevenLabs request failed: ${error instanceof Error ? error.message : 'network error'}` );
  }
  if ( !response.ok ) {
    const detail = ( await response.text().catch( () => '' ) ).slice( 0, 300 );
    throw new Error( `ElevenLabs returned HTTP ${response.status}${detail ? `: ${detail}` : ''}` );
  }
  const body = responseSchema.safeParse( await response.json().catch( () => null ) );
  if ( !body.success ) {
    throw new Error( 'ElevenLabs response has no audio_base64' );
  }
  const alignment = validateAlignment( body.data.alignment, text );
  const mp3 = Uint8Array.from( Buffer.from( body.data.audio_base64, 'base64' ) );
  const durationSeconds = mp3DurationSeconds( mp3 );
  if ( durationSeconds > MAX_NARRATION_SECONDS ) {
    throw new Error(
      `narration audio is ${durationSeconds.toFixed( 2 )} s, over the ${MAX_NARRATION_SECONDS} s limit ` +
      `(${VIDEO_SECONDS} s video, ${NARRATION_START_SECONDS} s start, ${END_MARGIN_SECONDS} s ending margin); shorten the narration`
    );
  }
  return { mp3, alignment, durationSeconds, captions: alignmentToCaptions( alignment ) };
}
