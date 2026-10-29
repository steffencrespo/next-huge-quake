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
 * `audio` and `final` use the default narration pacing, fast-beats (src/audio/pacing.ts, from the Panama D4 experiment): the
 * cached clips are sped up 1.2x with ffmpeg (pitch kept), pauses shortened except those the script declares on purpose, and
 * captions re-timed; clips are placed back to back, so the scenes that follow the voice tighten too. Outputs get a
 * -fast-beats suffix. --pace=natural gives the original timing and file names; --pace=fast tightens every pause. Library
 * clips and natural renders are never touched.
 * The library (assets/audio/edu/library/) is seeded from Episode 01's cache on every run (copies; the originals stay).
 * One credit is billed per character for eleven_multilingual_v2, which is what the estimates use; the ledger records
 * the characters actually sent, and the account balance in the ElevenLabs dashboard is the authority.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import { clipGap, resolvePacing } from '../src/audio/pacing.js';
import { OUTPUT_FORMAT, generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../src/audio/tts.js';
import type { TtsConfig } from '../src/audio/tts.js';
import type { Caption } from '../src/audio/soundtrack.js';
import { EPISODE_LIST, EPISODES, episodeSeconds } from '../src/edu/episodes.js';
import { DEFAULT_MUSIC, MUSIC } from '../src/audio/music.js';
import type { MusicKey } from '../src/audio/music.js';
import { MAG10 } from '../src/edu/ep07.js';
import { VERSUS } from '../src/edu/ep08.js';
import { AFTERSHOCKS } from '../src/edu/ep09.js';
import { DEPTH } from '../src/edu/ep05.js';
import { CALIFORNIA } from '../src/edu/ep06.js';
import { SF_IMAGES, SF_TSUNAMI } from '../src/edu/ep11.js';
import { NEXT_BIG_ONE } from '../src/edu/ep10.js';
import { HISTORIC, HISTORIC_LIST } from '../src/historic/episodes.js';
import type { EpisodeMeta } from '../src/edu/episodes.js';
import { clipKey, normalizeText, openLibrary } from '../src/edu/library.js';
import type { ClipIdentity } from '../src/edu/library.js';
import { MAX_CLIP_SECONDS, SCRIPT as EP01_SCRIPT, eduAudioSchema, placeClips } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';
import { paceNarration } from './lib/pace-audio.js';
import { generateLine, preflightLines } from './lib/edu-generate.js';
import type { LedgerEntry } from './lib/edu-generate.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const command = args.find( a => !a.startsWith( '--' ) ) ?? 'plan';
const flag = ( name: string ) => args.find( a => a.startsWith( `--${name}=` ) )?.split( '=' )[1];
const episodeArg = flag( 'episode' ) ?? 'all';
const BUDGET = Number( flag( 'budget' ) ?? 2000 );
const series = flag( 'series' ) ?? 'edu';
const pace = resolvePacing( flag( 'pace' ) );
const paceSuffix = pace ? `-${ pace.name }` : '';
const pacedDir = join( root, 'out', 'edu', 'paced', pace?.name ?? '' );
/** October 26, 28 and 30 Shorts (docs/experiments/oct-26-28-30-shorts.md). */
const OCT = { mag10: MAG10, versus: VERSUS, aftershocks: AFTERSHOCKS };
const pool = series === 'nbo' ? { nextbigone: NEXT_BIG_ONE } : series === 'oct' ? OCT : series === 'myth' ? { california: CALIFORNIA, sftsunami: SF_TSUNAMI } : series === 'depth' ? { depth: DEPTH } : series === 'historic' ? HISTORIC : EPISODES;
const episodes: EpisodeMeta[] = episodeArg === 'all' ? ( series === 'nbo' ? [ NEXT_BIG_ONE ] : series === 'oct' ? Object.values( OCT ) : series === 'myth' ? [ CALIFORNIA, SF_TSUNAMI ] : series === 'depth' ? [ DEPTH ] : series === 'historic' ? HISTORIC_LIST : EPISODE_LIST ) : [ ( pool as Record<string, EpisodeMeta> )[episodeArg] ];
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
const ledgerFile = join( root, 'out', 'edu', series === 'historic' ? 'credit-ledger-historic.json' : series === 'depth' ? 'credit-ledger-depth.json' : series === 'myth' ? 'credit-ledger-myth.json' : series === 'oct' ? 'credit-ledger-oct.json' : series === 'nbo' ? 'credit-ledger-nbo.json' : 'credit-ledger.json' );
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
  const todo = episodes.flatMap( ep => ep.script.filter( l => !library.has( identity( l.text ) ) ).map( l => ( { id: `${ep.id}/${l.id}`, text: l.text, characters: normalizeText( l.text ).length } ) ) );
  // --preflight-limit loosens only the pre-request estimate (12 chars/s is the slowest observed pace); the 9 s limit on the returned audio still applies.
  preflightLines( todo, Number( flag( 'preflight-limit' ) ?? MAX_CLIP_SECONDS ) );
  for ( const ep of episodes ) {
    for ( const line of ep.script ) {
      const id = identity( line.text );
      if ( library.has( id ) ) {
        continue;
      }
      const characters = normalizeText( line.text ).length;
      // The text is sent exactly as written in the script (normalization only decides the cache key).
      const speech = await generateLine( {
        episode: ep.id, line, key: clipKey( id ), characters, budget: BUDGET, limitSeconds: MAX_CLIP_SECONDS, spent,
        record: entry => {
          mkdirSync( dirname( ledgerFile ), { recursive: true } );
          writeFileSync( ledgerFile, JSON.stringify( [ ...readLedger(), entry ], null, 2 ) );
        },
        request: ( text, limit ) => generateSpeech( text, config, fetch, limit ),
        save: s => library.addGenerated( id, s.mp3, s.alignment, `${ep.id}:${line.id}` )
      } );
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
  sftsunami: [
    'Cal OES Tsunami Program, Tsunami Signs and Tsunami Risk pages (hazard-zone and evacuation signs; maximum considered runup from extreme, infrequent sources; a tsunami is usually a series of waves and danger can last hours; follow posted routes and stay out until the all-clear). https://www.caloes.ca.gov/office-of-the-director/operations/planning-preparedness-prevention/seismic-hazards/tsunami-program/',
    'California Geological Survey and Cal OES: San Francisco County Tsunami Hazard Area map (the map is not reproduced in this video; check an address in Cal OES MyHazards). https://conservation.ca.gov/cgs/tsunami/maps/san-francisco',
    'NOAA / National Weather Service, U.S. Tsunami Warning Centers: message definitions (Warning, Advisory, Watch, Information Statement). https://www.tsunami.gov/?page=message_definitions',
    'NOAA Center for Tsunami Research (PMEL): San Francisco, California tsunami forecast model report (historical tsunami record, including the 1964 Alaska tsunami in San Francisco Bay). https://nctr.pmel.noaa.gov/forecast_model_reports/final_reports/03_SanFranciscoCA_3342_web.pdf',
    'USGS: Tsunami record from the great 1906 San Francisco earthquake (about 10 cm at the Presidio tide gauge). https://www.usgs.gov/centers/pcmsc/science/tsunami-record-great-1906-san-francisco-earthquake'
  ],
  california: [ 'USGS FAQ: Will California eventually fall into the ocean? https://www.usgs.gov/faqs/will-california-eventually-fall-ocean', 'USGS: Earthquake Facts & Earthquake Fantasy (plate motion about 46 mm per year; Los Angeles and San Francisco neighbors in about 15 million years at this rate). https://www.usgs.gov/programs/earthquake-hazards/earthquake-facts-earthquake-fantasy' ],
  mag10: [ 'USGS FAQ: Can "MegaQuakes" really happen? Like a magnitude 10 or larger? (largest recorded earthquake, magnitude 9.5 in Chile in 1960; longer faults can host larger earthquakes; no known fault is long enough for a magnitude 10. The 1960 rupture length of about 1,000 km follows published rupture models, e.g. Barrientos and Ward 1990 and Ho et al. 2019, J. Geophys. Res. Solid Earth). https://www.usgs.gov/faqs/can-megaquakes-really-happen-a-magnitude-10-or-larger' ],
  versus: [ 'USGS: Earthquake Magnitude, Energy Release, and Shaking Intensity (each whole magnitude step is about 32 times more energy). https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity' ],
  aftershocks: [ 'USGS FAQ: Foreshocks, aftershocks - what\'s the difference? https://www.usgs.gov/faqs/foreshocks-aftershocks-whats-difference', 'USGS FAQ: What is the difference between aftershocks and swarms? https://www.usgs.gov/faqs/what-difference-between-aftershocks-and-swarms' ],
  nextbigone: [ 'USGS: Earthquake Outlook for the San Francisco Bay Region 2014-2043 (Fact Sheet 2016-3020; 72% chance of at least one M6.7+ earthquake in 2014-2043, whole regional fault system). https://pubs.usgs.gov/publication/fs20163020', 'USGS: Earthquake Probabilities and Hazards in the U.S. Pacific Northwest (Fact Sheet 2025-3050; 10-15% chance of an approximately M9 Cascadia Subduction Zone earthquake in 50 years; last great earthquake January 26, 1700). https://pubs.usgs.gov/publication/fs20253050', 'Map data: Natural Earth (public domain), 1:10m land, coastline and borders, rendered with MapLibre GL JS.' ],
  depth: [ 'USGS depth classes (shallow 0-70 km, intermediate 70-300 km, deep 300-700 km) and the relation of focal depth to surface shaking. https://www.usgs.gov/programs/earthquake-hazards' ],
  sanfrancisco1906: [ 'USGS Earthquake Catalog (ComCat) and USGS 1906 San Francisco earthquake pages. https://earthquake.usgs.gov/earthquakes/events/1906calif/18april/', 'National Park Service (1906 earthquake history).' ]
};
function historicCredits( ep: EpisodeMeta ): string[] {
  return [
    'Music: ' + needMusic().credit,
    'Narration: ElevenLabs text-to-speech (voice: Daniel).',
    'Sound effects: synthesized for this video.',
    ...( [ 'depth', 'mag10', 'versus', 'aftershocks', 'nextbigone' ].includes( ep.id ) ? [] : [ 'Map data: Natural Earth (public domain), 1:50m land and 1:110m land via world-atlas.' ] ),
    ...( SOURCES[ep.id] ?? [] ).map( x => 'Source: ' + x ),
    ...( ep.id === 'sftsunami' ? [ 'Synthetic content: the seven photographic-style images were generated with GPT Image 2.5 Sunburst (via ElevenLabs). They are AI-generated illustrations, not photographs or footage of real events, and none shows an actual tsunami. The sign graphic is generic, not an installed sign. Disclose as altered or synthetic content in YouTube Studio.' ] : [] ),
    ep.id === 'sftsunami' ? 'The Pacific route, wavefronts and Alaska–Aleutian arc position, and the subduction and strike-slip diagrams (the strike-slip diagram is a top-down map view), are schematic illustrations, not data, forecasts or footage. The official California Geological Survey hazard map is not reproduced; no hazard boundaries are drawn.' : ep.id === 'nextbigone' ? 'The map traces, rings and labels are schematic illustrations, not survey data or footage. The Bay Area and Cascadia probabilities cover different faults, magnitudes and time windows and are not comparable; no joint probability exists, and the question of both regions is hypothetical, not a forecast.' : ep.id === 'mag10' ? 'The fault-length bars are schematic illustrations with no stated lengths for the magnitude 10 fault; not data or footage.' : ep.id === 'versus' ? 'The dot grid is an illustration of the energy ratio (about 5,600 to 1, 10^(1.5 x 2.5)), not data or footage. The ratio is approximate: other USGS energy formulas give a somewhat smaller value.' : ep.id === 'aftershocks' ? 'The seismogram, fault map, decay chart, building and aftershock maps are schematic illustrations, not real data or footage.' : ep.id === 'california' ? 'The fault trace, plate arrows, the accelerated Los Angeles move and the strike-slip diagram are schematic illustrations, not to scale, not data or footage.' : ep.id === 'depth' ? 'Cross-sections, wave rings and the city are schematic illustrations, not to scale, not data or footage (the depth ruler is to scale).' : 'Maps, wave routes and arcs, fault traces, cross-sections, skyline and fire graphics are illustrations, not data or archival footage.',
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
    if ( ep.id === 'sftsunami' ) {
      // Approved stills: copies of the originals under assets/myth-sf-tsunami/ (never renamed or modified), staged under short names.
      for ( const [ key, img ] of Object.entries( SF_IMAGES ) ) {
        const source = join( root, 'assets', 'myth-sf-tsunami', img.file );
        if ( !existsSync( source ) ) {
          throw new Error( `missing approved image ${ source }` );
        }
        stage( `myth-sf-tsunami/${ key }.png`, readFileSync( source ) );
      }
    }
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
    const result = spawnSync( 'npx', [ 'remotion', 'render', ep.compositionId, out, ...( ep.compositionId === 'WhereWillTheNextBigOneHitFull' ? [ '--gl=angle' ] : [] ), `--props=${propsFile}`, '--overwrite' ], { cwd: root, stdio: 'inherit' } );
    if ( result.status !== 0 ) {
      throw new Error( `render failed (exit ${result.status})` );
    }
    if ( withAudio ) {
      writeFileSync( out.replace( /\.mp4$/, '.credits.txt' ), ( series === 'historic' || series === 'depth' || series === 'myth' || series === 'oct' || series === 'nbo' ? historicCredits( ep ) : [ 'Music: ' + needMusic().credit, 'Narration: ElevenLabs text-to-speech.', 'Sound effects: synthesized for this video.', '', 'Production Technology', 'Automated news and video production powered by Output.ai', 'https://output.ai', '' ] ).join( '\n' ) );
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
