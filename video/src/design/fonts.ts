/**
 * Loads the bundled fonts from public/fonts before the first frame renders. No system or network fonts are used.
 */
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

const FACES = [
  ...[ 600, 700, 800 ].map( weight => ( { family: 'Barlow Condensed', weight, file: `fonts/barlow-condensed/barlow-condensed-latin-${weight}-normal.woff2` } ) ),
  ...[ 400, 500, 600, 700 ].map( weight => ( { family: 'Inter', weight, file: `fonts/inter/inter-latin-${weight}-normal.woff2` } ) )
];

let loading: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  if ( loading ) {
    return loading;
  }
  const handle = delayRender( 'load bundled fonts' );
  loading = Promise.all( FACES.map( async face => {
    const font = new FontFace( face.family, `url(${staticFile( face.file )}) format('woff2')`, { weight: String( face.weight ) } );
    document.fonts.add( await font.load() );
  } ) ).then( () => continueRender( handle ) ).catch( error => cancelRender( error ) );
  return loading;
}
