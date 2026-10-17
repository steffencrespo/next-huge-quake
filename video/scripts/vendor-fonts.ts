/**
 * Copies the bundled fonts (SIL OFL 1.1) from the pinned @fontsource packages into public/fonts, with their licenses.
 * The output is committed, so renders never fetch fonts from the network. Re-run only when changing weights or versions.
 *
 * Usage: tsx scripts/vendor-fonts.ts
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire( import.meta.url );
const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );

const FAMILIES = [
  { pkg: '@fontsource/barlow-condensed', prefix: 'barlow-condensed', dir: 'barlow-condensed', weights: [ 600, 700, 800 ] },
  { pkg: '@fontsource/inter', prefix: 'inter', dir: 'inter', weights: [ 400, 500, 600, 700 ] }
];

for ( const family of FAMILIES ) {
  const source = dirname( require.resolve( `${family.pkg}/package.json` ) );
  const target = join( root, 'public', 'fonts', family.dir );
  mkdirSync( target, { recursive: true } );
  copyFileSync( join( source, 'LICENSE' ), join( target, 'OFL.txt' ) );
  for ( const weight of family.weights ) {
    const file = `${family.prefix}-latin-${weight}-normal.woff2`;
    copyFileSync( join( source, 'files', file ), join( target, file ) );
  }
  console.log( `copied ${family.pkg} ${family.weights.join( ', ' )} -> public/fonts/${family.dir}` );
}
