/**
 * Review tooling, not part of the video: a labeled grid of the DesignBoard phone-size stills.
 * Rendered by scripts/render-contact-sheet.ts with a staging public dir holding the stills and the bundled fonts.
 */
import { useState } from 'react';
import { AbsoluteFill, Img, cancelRender, continueRender, delayRender, staticFile } from 'remotion';

export type Tile = { file: string; label: string };
export type Row = { title: string; tiles: Tile[] };
export type ContactSheetProps = { title: string; rows: Row[] };

export const TILE = { width: 360, height: 640 };
export const GAP = 28;
export const HEADER = 110;
export const ROW_TITLE = 56;
export const LABEL = 44;
export const COLUMNS = 4;

export const sheetSize = ( rows: number ) => ( {
  width: COLUMNS * TILE.width + ( COLUMNS + 1 ) * GAP,
  height: HEADER + rows * ( ROW_TITLE + LABEL + TILE.height + GAP ) + GAP
} );

const useFonts = () => useState( () => {
  const handle = delayRender( 'contact sheet fonts' );
  Promise.all( [ 500, 600 ].map( async weight => {
    const font = new FontFace( 'Inter', `url(${staticFile( `fonts/inter/inter-latin-${weight}-normal.woff2` )}) format('woff2')`, { weight: String( weight ) } );
    document.fonts.add( await font.load() );
  } ) ).then( () => continueRender( handle ) ).catch( cancelRender );
} );

export const ContactSheet: React.FC<ContactSheetProps> = ( { title, rows } ) => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: '#1A2230', fontFamily: 'Inter, sans-serif', color: '#F4F6FA', padding: GAP, boxSizing: 'border-box' }}>
      <div style={{ height: HEADER - GAP, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <div style={{ fontSize: 34, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#A9B4C6' }}>Phone-preview size (360×640, one third of 1080×1920). Full-resolution PNGs: video/out/design/</div>
      </div>
      {rows.map( row => (
        <div key={row.title} style={{ marginTop: GAP }}>
          <div style={{ height: ROW_TITLE, display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, borderBottom: '2px solid #D7202A' }}>{row.title}</div>
          <div style={{ display: 'flex', gap: GAP }}>
            {row.tiles.map( tile => (
              <div key={tile.file} style={{ width: TILE.width }}>
                <div style={{ height: LABEL, display: 'flex', alignItems: 'center', fontSize: 19, fontWeight: 500, color: '#D5DCE7' }}>{tile.label}</div>
                <Img src={staticFile( tile.file )} style={{ width: TILE.width, height: TILE.height, display: 'block', outline: '1px solid #3A4558' }} />
              </div>
            ) )}
          </div>
        </div>
      ) )}
    </AbsoluteFill>
  );
};
