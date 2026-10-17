/**
 * Builds out/design/contact-sheet.png: all DesignBoard phone-size stills in one labeled grid, for visual review.
 * Run scripts/render-design.ts first. The full-resolution PNGs in out/design/ are left untouched.
 *
 * Usage: tsx scripts/render-contact-sheet.ts
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { ROWS } from './contact-sheet/rows.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const phone = join( root, 'out', 'design', 'phone' );
const staging = join( root, 'out', 'contact-sheet-public' );

rmSync( staging, { recursive: true, force: true } );
mkdirSync( staging, { recursive: true } );
cpSync( join( root, 'public', 'fonts' ), join( staging, 'fonts' ), { recursive: true } );
for ( const tile of ROWS.flatMap( row => row.tiles ) ) {
  const source = join( phone, tile.file );
  if ( !existsSync( source ) ) {
    throw new Error( `missing ${source}; run scripts/render-design.ts first` );
  }
  cpSync( source, join( staging, tile.file ) );
}

const output = join( root, 'out', 'design', 'contact-sheet.png' );
execFileSync( 'npx', [ 'remotion', 'still', 'scripts/contact-sheet/index.ts', 'ContactSheet', output, `--public-dir=${staging}`, '--image-format=png', '--overwrite' ], { cwd: root, stdio: 'ignore' } );
rmSync( staging, { recursive: true, force: true } );
console.log( `wrote ${output}` );
