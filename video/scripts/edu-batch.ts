/**
 * Educational Shorts 02 to 04 (predict, magnitude, ring): narration library, credit estimate, generation and rendering.
 *
 * Usage: tsx scripts/edu-batch.ts <command> [--series=edu|historic|depth|myth] [--episode=<id>|all] [--budget=2000]
 *   --series=historic: Historic Earthquakes 01-03 (chile1960, japan2011, sanfrancisco1906); own credit ledger.
 *   plan      (default) per line: reused from the narration library or new; characters and estimated credits. No request.
 *   generate  requests ONLY the lines the library does not hold, one at a time, stops at the first failure or when the
 *             batch budget would be exceeded, and records every request in out/edu/credit-ledger.json. Paid.
 *   audio     builds out/edu/<episode>/audio.json (placement, captions, music) once every line exists. No request.
 *   preview   silent render with timed placeholder captions to out/edu/preview/<episode>.mp4. No audio, no request.
 *   final     renders out/edu/final/<episode>.mp4 with narration, music and effects from the library. No request.
 * Add --pace=fast to `audio` or `final` for the fast narration preset (src/audio/pacing.ts, from the Panama D4 experiment): the
 * cached clips are sped up with ffmpeg (pitch kept), pauses shortened and captions re-timed, and the clips are placed back to
 * back, so the scenes that follow the voice tighten too. Outputs get a -fast suffix; library clips and natural renders are untouched.
 * The library (assets/audio/edu/library/) is seeded from Episode 01's cache on every run (copies; the originals stay).
 * One credit is billed per character for eleven_multilingual_v2, which is what the estimates use; the ledger records
 * the characters actually sent, and the account balance in the ElevenLabs dashboard is the authority.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import { clipGap, pacingPreset } from '../src/audio/pacing.js';
import { OUTPUT_FORMAT, generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../src/audio/tts.js';
import type { TtsConfig } from '../src/audio/tts.js';
import type { Caption } from '../src/audio/soundtrack.js';
import { EPISODE_LIST, EPISODES, episodeSeconds } from '../src/edu/episodes.js';
import { DEFAULT_MUSIC, MUSIC } from '../src/audio/music.js';
import type { MusicKey } from '../src/audio/music.js';
import { DEPTH } from '../src/edu/ep05.js';
import { CALIFORNIA } from '../src/edu/ep06.js';
import { HISTORIC, HISTORIC_LIST } from '../src/historic/episodes.js';
import type { EpisodeMeta } from '../src/edu/episodes.js';
import { clipKey, normalizeText, openLibrary } from '../src/edu/library.js';
import type { ClipIdentity } from '../src/edu/library.js';
import { MAX_CLIP_SECONDS, SCRIPT as EP01_SCRIPT, eduAudioSchema, placeClips } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';
import { paceNarration } from './lib/pace-audio.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const command = args.find( a => !a.startsWith( '--' ) ) ?? 'plan';
const flag = ( name: string ) => args.find( a => a.startsWith( `--${name}=` ) )?.split( '=' )[1];
const episodeArg = flag( 'episode' ) ?? 'all';
const BUDGET = Number( flag( 'budget' ) ?? 2000 );
const series = flag( 'series' ) ?? 'edu';
const pace = flag( 'pace' ) ? pacingPreset( flag( 'pace' )! ) : undefined;
const paceSuffix = pace ? `-${ pace.name }` : '';
const pacedDir = join( root, 'out', 'edu', 'paced', pace?.name ?? '' );
const pool = series === 'myth' ? { california: CALIFORNIA } : series === 'depth' ? { depth: DEPTH } : series === 'historic' ? HISTORIC : EPISODES;
const episodes: EpisodeMeta[] = episodeArg === 'all' ? ( series === 'myth' ? [ CALIFORNIA ] : series === 'depth' ? [ DEPTH ] : series === 'historic' ? HISTORIC_LIST : EPISODE_LIST ) : [ ( pool as Record<string, EpisodeMeta> )[episodeArg] ];
if ( episodes.some( e => !e ) ) {
  throw new Error( `unknown episode '${episodeArg}'` );
}

/** Music choices come from src/audio/music.ts (YouTube Audio Library only; the retired Pixabay track is never used). */
const musicKey = flag( 'music' ) ?? DEFAULT_MUSIC;
const needMusic = () => {
  if ( !( musicKey in MUSIC ) ) {
    throw new Error( `unknown --music=${ musicKey }; choose ${ Object.keys( MUSIC ).join( ' | ' ) }` );
  }
  return MUSIC[musicKey as MusicKey];
};
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );
const ledgerFile = join( root, 'out', 'edu', series === 'historic' ? 'credit-ledger-historic.json' : series === 'depth' ? 'credit-ledger-depth.json' : series === 'myth' ? 'credit-ledger-myth.json' : 'credit-ledger.json' );
type LedgerEntry = { at: string; episode: string; line: string; key: string; characters: number };
const readLedger = (): LedgerEntry[] => ( existsSync( ledgerFile ) ? JSON.parse( readFileSync( ledgerFile, 'utf8' ) ) : [] );

const envFile = join( root, '.env.local' );
const config: TtsConfig = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
const identity = ( text: string ): ClipIdentity => ( { text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );

/** Seeds the library with Episode 01's approved clips (copies, same voice and model as the current configuration). */
function importEpisode01() {
  const dir = join( root, 'assets', 'audio', 'edu', 'why-earthquakes' );
  let added = 0;
  for ( const line of EP01_SCRIPT ) {
    const mp3 = join( dir, `${line.id}.mp3` );
    const alignment = join( dir, `${line.id}.alignment.json` );
    if ( existsSync( mp3 ) && existsSync( alignment ) && library.addFiles( identity( line.text ), `ep01:${line.id}`, mp3, alignment ) ) {
      added++;
    }
  }
  return added;
}

const lineStatus = ( text: string ) => ( library.has( identity( text ) ) ? 'reused' : 'new' );
const newCharacters = ( ep: EpisodeMeta ) => ep.script.filter( l => lineStatus( l.text ) === 'new' ).reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 );

function plan() {
  console.log( `voice ${config.voiceId}, model ${config.modelId}, format ${OUTPUT_FORMAT}; library holds ${Object.keys( library.manifest() ).length} clips` );
  let total = 0;
  const seen = new Set<string>();
  for ( const ep of episodes ) {
    console.log( `\nEpisode ${String( ep.number ).padStart( 2, '0' )} (${ep.id}): ${ep.title}` );
    let chars = 0;
    for ( const line of ep.script ) {
      const status = lineStatus( line.text );
      const key = clipKey( identity( line.text ) );
      const dup = status === 'new' && seen.has( key );
      seen.add( key );
      const n = normalizeText( line.text ).length;
      chars += status === 'new' && !dup ? n : 0;
      console.log( `  ${status === 'reused' ? 'REUSED' : dup ? 'shared' : 'NEW   '} ${String( n ).padStart( 3 )}  ${line.id.padEnd( 10 )} ${line.text}` );
    }
    total += chars;
    console.log( `  -> ${chars} new characters = ~${chars} credits; planned length ${episodeSeconds( ep )} s` );
  }
  console.log( `\nTOTAL new credits (estimate): ${total} of ${BUDGET} authorised. Already spent from the ledger: ${readLedger().reduce( ( n, e ) => n + e.characters, 0 )}.` );
}

async function generate() {
  const spent = () => readLedger().reduce( ( n, e ) => n + e.characters, 0 );
  for ( const ep of episodes ) {
    for ( const line of ep.script ) {
      const id = identity( line.text );
      if ( library.has( id ) ) {
        continue;
      }
      const characters = normalizeText( line.text ).length;
      if ( spent() + characters > BUDGET ) {
        throw new Error( `budget: ${spent()} credits already spent, '${line.id}' needs ${characters} more, over ${BUDGET}. Stopping.` );
      }
      // The text is sent exactly as written in the script (normalization only decides the cache key).
      const speech = await generateSpeech( line.text, config, fetch, MAX_CLIP_SECONDS );
      library.addGenerated( id, speech.mp3, speech.alignment, `${ep.id}:${line.id}` );
      mkdirSync( dirname( ledgerFile ), { recursive: true } );
      writeFileSync( ledgerFile, JSON.stringify( [ ...readLedger(), { at: new Date().toISOString(), episode: ep.id, line: line.id, key: clipKey( id ), characters } ], null, 2 ) );
      console.log( `  generated ${ep.id}/${line.id}: ${speech.durationSeconds.toFixed( 2 )} s, ${characters} credits (ledger total ${spent()})` );
    }
  }
}

function voicedRmsDb( mp3: string ): number {
  const tmp = join( root, 'out', 'edu', 'level.wav' );
  mkdirSync( dirname( tmp ), { recursive: true } );
  execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '22050', tmp ], { cwd: root } );
  const pcm = readFileSync( tmp ).subarray( 44 );
  rmSync( tmp, { force: true } );
  let sum = 0;
  let count = 0;
  for ( let i = 0; i + 1 < pcm.length; i += 2 ) {
    const v = pcm.readInt16LE( i ) / 32768;
    if ( Math.abs( v ) > 0.02 ) {
      sum += v * v;
      count++;
    }
  }
  return 10 * Math.log10( sum / Math.max( 1, count ) );
}
const gainFor = ( db: number, target: number ) => Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - db ) / 20 ) ) ) * 100 ) / 100;

const audioFile = ( ep: EpisodeMeta ) => join( root, 'out', 'edu', ep.id, `audio-${ musicKey }${ paceSuffix }.json` );

/** The clip sped up and tightened by the pacing preset (cached in out/edu/paced/<preset>/; the library clip is not touched). */
function pacedClip( key: string, mp3: string, captions: Caption[] ) {
  const out = join( pacedDir, `${ key }${ paceSuffix }.mp3` );
  const meta = join( pacedDir, `${ key }${ paceSuffix }.json` );
  if ( !existsSync( out ) || !existsSync( meta ) ) {
    const result = paceNarration( { root, source: mp3, captions, preset: pace!, outMp3: out } );
    writeFileSync( meta, `${ JSON.stringify( result ) }\n` );
  }
  return JSON.parse( readFileSync( meta, 'utf8' ) ) as { duration: number; captions: Caption[]; sourceDuration: number };
}
function buildAudio( ep: EpisodeMeta ) {
  const missing = ep.script.filter( l => !library.has( identity( l.text ) ) );
  if ( missing.length > 0 ) {
    throw new Error( `${ep.id}: ${missing.length} lines have no narration yet (${missing.map( l => l.id ).join( ', ' )})` );
  }
  const levels = ep.script.map( l => voicedRmsDb( library.paths( identity( l.text ) ).mp3 ) );
  const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
  const clips: ClipInput[] = ep.script.map( ( l, i ) => {
    const p = library.paths( identity( l.text ) );
    const speech = speechFromAudio( l.text, readFileSync( p.mp3 ), JSON.parse( readFileSync( p.alignment, 'utf8' ) ), MAX_CLIP_SECONDS );
    const captions = alignmentToCaptions( speech.alignment );
    const gain = gainFor( levels[i], target );
    if ( pace ) {
      mkdirSync( pacedDir, { recursive: true } );
      const fast = pacedClip( p.key, p.mp3, captions );
      return { id: l.id, file: `audio/edu/${p.key}${paceSuffix}.mp3`, duration: fast.duration, captions: fast.captions, gain };
    }
    return { id: l.id, file: `audio/edu/${p.key}.mp3`, duration: speech.durationSeconds, captions, gain };
  } );
  const audio = eduAudioSchema.parse( { ...placeClips( ep.script, clips, pace ? { gap: clipGap( pace ), keepPauses: pace.keepPauses } : {} ), musicFile: needMusic().file, musicCredit: needMusic().credit, ...( pace ? { pacing: pace.name } : {} ) } );
  mkdirSync( dirname( audioFile( ep ) ), { recursive: true } );
  writeFileSync( audioFile( ep ), `${JSON.stringify( audio, null, 2 )}\n` );
  console.log( `${ep.id}: narration ${audio.narrationStart}-${audio.narrationEnd} s, ${audio.captions.length} captions, video ${episodeSeconds( ep, audio )} s` );
  return audio;
}

/** Attribution record for a Historic Earthquakes Short (public description). The Joerd/terrain block is not needed: these maps use Natural Earth vector data, not terrain tiles. */
const SOURCES: Record<string, string[]> = {
  chile1960: [ 'USGS Earthquake Catalog (ComCat): 1960 Great Chilean (Valdivia) earthquake, M9.5. https://earthquake.usgs.gov/', 'USGS Hawaiian Volcano Observatory: 1960 tsunami travel times and Hilo deaths. https://www.usgs.gov/center-news/golden-anniversary-chilean-earthquake-comes-early' ],
  japan2011: [ 'USGS Earthquake Catalog (ComCat) and event page: 2011 Great Tohoku Earthquake, M9.1 Mww. https://earthquake.usgs.gov/earthquakes/eventpage/official20110311054624120_30', 'Japan Meteorological Agency: tsunami warning improvements after 2011. https://www.data.jma.go.jp/eqev/data/en/tsunami/LessonsLearned_Improvements_brochure.pdf' ],
  california: [ 'USGS FAQ: Will California eventually fall into the ocean? https://www.usgs.gov/faqs/will-california-eventually-fall-ocean', 'USGS: Earthquake Facts & Earthquake Fantasy (plate motion about 46 mm per year; Los Angeles and San Francisco neighbors in about 15 million years at this rate). https://www.usgs.gov/programs/earthquake-hazards/earthquake-facts-earthquake-fantasy' ],
  depth: [ 'USGS depth classes (shallow 0-70 km, intermediate 70-300 km, deep 300-700 km) and the relation of focal depth to surface shaking. https://www.usgs.gov/programs/earthquake-hazards' ],
  sanfrancisco1906: [ 'USGS Earthquake Catalog (ComCat) and USGS 1906 San Francisco earthquake pages. https://earthquake.usgs.gov/earthquakes/events/1906calif/18april/', 'National Park Service (1906 earthquake history).' ]
};
function historicCredits( ep: EpisodeMeta ): string[] {
  return [
    'Music: ' + needMusic().credit,
    'Narration: ElevenLabs text-to-speech (voice: Daniel).',
    'Sound effects: synthesized for this video.',
    ...( ep.id === 'depth' ? [] : [ 'Map data: Natural Earth (public domain), 1:50m land and 1:110m land via world-atlas.' ] ),
    ...( SOURCES[ep.id] ?? [] ).map( x => 'Source: ' + x ),
    ep.id === 'california' ? 'The fault trace, plate arrows, the accelerated Los Angeles move and the strike-slip diagram are schematic illustrations, not to scale, not data or footage.' : ep.id === 'depth' ? 'Cross-sections, wave rings and the city are schematic illustrations, not to scale, not data or footage (the depth ruler is to scale).' : 'Maps, wave routes and arcs, fault traces, cross-sections, skyline and fire graphics are illustrations, not data or archival footage.',
    '',
    'Production Technology',
    'Automated news and video production powered by Output.ai',
    'https://output.ai',
    ''
  ];
}

function render( ep: EpisodeMeta, withAudio: boolean ) {
  const out = join( root, 'out', 'edu', withAudio ? 'final' : 'preview', `${ep.id}${ withAudio ? `-${ musicKey }${ paceSuffix }` : '' }.mp4` );
  mkdirSync( dirname( out ), { recursive: true } );
  const staged: string[] = [];
  const stage = ( rel: string, bytes: Buffer ) => {
    const target = join( root, 'public', rel );
    if ( existsSync( target ) ) {
      if ( !readFileSync( target ).equals( bytes ) ) {
        throw new Error( `${target} exists with different content; remove it and retry` );
      }
      return;
    }
    mkdirSync( dirname( target ), { recursive: true } );
    writeFileSync( target, bytes );
    staged.push( target );
  };
  try {
    let props = {};
    if ( withAudio ) {
      needMusic();
      const audio = existsSync( audioFile( ep ) ) ? eduAudioSchema.parse( JSON.parse( readFileSync( audioFile( ep ), 'utf8' ) ) ) : buildAudio( ep );
      props = { audio };
      for ( const c of audio.clips ) {
        const name = c.file.split( '/' ).pop()!;
        stage( c.file, readFileSync( pace && name.endsWith( `${ paceSuffix }.mp3` ) ? join( pacedDir, name ) : join( library.dir, name ) ) );
      }
      stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
      stage( SFX_FILES.rumble, wavBytes( rumble() ) );
      stage( SFX_FILES.boom, wavBytes( boom() ) );
      for ( const e of Object.values( EXTRA_SFX ) ) {
        stage( e.file, wavBytes( e.make() ) );
      }
    }
    const propsFile = out.replace( /\.mp4$/, '.props.json' );
    writeFileSync( propsFile, JSON.stringify( props ) );
    const result = spawnSync( 'npx', [ 'remotion', 'render', ep.compositionId, out, `--props=${propsFile}`, '--overwrite' ], { cwd: root, stdio: 'inherit' } );
    if ( result.status !== 0 ) {
      throw new Error( `render failed (exit ${result.status})` );
    }
    if ( withAudio ) {
      writeFileSync( out.replace( /\.mp4$/, '.credits.txt' ), ( series === 'historic' || series === 'depth' || series === 'myth' ? historicCredits( ep ) : [ 'Music: ' + needMusic().credit, 'Narration: ElevenLabs text-to-speech.', 'Sound effects: synthesized for this video.', '', 'Production Technology', 'Automated news and video production powered by Output.ai', 'https://output.ai', '' ] ).join( '\n' ) );
    }
    console.log( `wrote ${out}` );
  } finally {
    staged.forEach( f => rmSync( f, { force: true } ) );
  }
}

try {
  const imported = importEpisode01();
  if ( imported > 0 ) {
    console.log( `library: imported ${imported} Episode 01 clips (copies)` );
  }
  if ( command === 'plan' ) {
    plan();
  } else if ( command === 'generate' ) {
    plan();
    await generate();
    episodes.forEach( buildAudio );
  } else if ( command === 'audio' ) {
    episodes.forEach( buildAudio );
  } else if ( command === 'preview' ) {
    episodes.forEach( ep => render( ep, false ) );
  } else if ( command === 'final' ) {
    episodes.forEach( ep => render( ep, true ) );
  } else {
    throw new Error( `unknown command '${command}'` );
  }
} catch ( error ) {
  console.error( `edu-batch failed: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
