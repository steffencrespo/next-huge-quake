/**
 * Renders the kids Short: tsx scripts/render-kids.ts [--final] [--out=<file.mp4>]
 * Without --final: the silent preview with placeholder captions. With --final: narration, music and captions from
 * out/kids/audio.json (see generate-kids-narration.ts). Stages audio under public/audio/kids/ (never overwriting
 * different content), removes only what it staged, and writes <out>.credits.txt. Calls no paid service.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { kidsAudioSchema } from '../src/kids/audio.js';
import { kidsCredits } from '../src/kids/credits.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const final = process.argv.includes( '--final' );
const defaultName = final ? 'why-does-the-earth-shake-final.mp4' : 'why-does-the-earth-shake-silent-preview.mp4';
const out = resolve( process.argv.find( a => a.startsWith( '--out=' ) )?.slice( 6 ) ?? join( root, 'out', 'kids', defaultName ) );
mkdirSync( dirname( out ), { recursive: true } );

const created: string[] = [];
try {
  const args = [ 'remotion', 'render', 'KidsWhyEarthShakes', out, '--overwrite' ];
  if ( final ) {
    const audioFile = join( root, 'out', 'kids', 'audio.json' );
    if ( !existsSync( audioFile ) ) {
      throw new Error( 'out/kids/audio.json is missing: run scripts/generate-kids-narration.ts first' );
    }
    const audio = kidsAudioSchema.parse( JSON.parse( readFileSync( audioFile, 'utf8' ) ) );
    const files = [
      ...audio.clips.map( c => ( { staged: c.file, source: join( root, 'assets', 'audio', 'kids', 'narration', `${c.id}.mp3` ) } ) ),
      { staged: audio.musicFile, source: join( root, 'assets', audio.musicFile ) }
    ];
    for ( const { staged, source } of files ) {
      const target = join( root, 'public', staged );
      if ( existsSync( target ) ) {
        if ( !readFileSync( target ).equals( readFileSync( source ) ) ) {
          throw new Error( `${target} exists with different content; remove it and retry` );
        }
        continue;
      }
      mkdirSync( dirname( target ), { recursive: true } );
      copyFileSync( source, target );
      created.push( target );
    }
    const props = join( dirname( out ), `${basename( out, '.mp4' )}.props.json` );
    writeFileSync( props, JSON.stringify( { audio } ) );
    args.push( `--props=${props}` );
  }
  const result = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
  if ( result.status !== 0 ) {
    throw new Error( `render failed (exit ${result.status})` );
  }
  writeFileSync( out.replace( /\.mp4$/, '.credits.txt' ), kidsCredits( final ) );
  console.log( `wrote ${out}` );
} catch ( error ) {
  console.error( error instanceof Error ? error.message : String( error ) );
  process.exitCode = 1;
} finally {
  created.forEach( f => rmSync( f, { force: true } ) );
}
