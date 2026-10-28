/**
 * Experiment: Northridge 1994 with six AI-generated (Nano Banana 2 Lite) still images layered over the HistoricNorthridge1994 composition.
 * The inner composition keeps all audio (narration, Deified music, SFX) at the original timing; its captions are blanked and redrawn here
 * above the images. Image windows follow the narration beats (so they track the real fast-beats timing). Nothing here is published.
 */
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { COLORS } from '../../src/design/tokens.js';
import { FPS } from '../../src/edu/EduShort.js';
import { audioBeats, episodeSeconds } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { vis } from '../../src/edu/kit.js';
import { eduAudioSchema } from '../../src/edu/narration.js';
import type { EduAudio } from '../../src/edu/narration.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { HISTORIC } from '../../src/historic/episodes.js';
import { HistoricNorthridge1994 } from '../../src/historic/northridge1994.js';
import { Card, HistoricTitle } from '../../src/historic/kit.js';

type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
type Shot = { key: string; file: string; from: number; to: number; fadeIn: number; fadeOut: number; kb: Kb; dim?: number };

/** Staged copies live in public/exp-northridge-cinematic/ (source names are the narration lines). Window = the narration line the image illustrates. */
export const shotsFor = ( b: Beats ): Shot[] => [
  { key: 'hook', file: 'hook.jpg', from: 0, to: b.hook.end + 0.3, fadeIn: 0, fadeOut: 0.5, kb: { s: [ 1.04, 1.2 ], x: [ 0, -12 ], y: [ 0, -28 ] } },
  { key: 'date', file: 'date.jpg', from: b.date.start - 0.15, to: b.mag.start + 1.0, fadeIn: 0.3, fadeOut: 0.5, kb: { s: [ 1.18, 1.05 ], x: [ 10, -6 ], y: [ 16, 0 ] } },
  // The blind-thrust diagram animates the slip first; the cutaway picture takes over for "and the Santa Susana Mountains rose".
  { key: 'rupture', file: 'rupture.jpg', from: b.rupture.start + 1.8, to: b.rupture.end + 0.15, fadeIn: 0.35, fadeOut: 0.45, kb: { s: [ 1.05, 1.18 ], x: [ -12, 10 ], y: [ 10, -12 ] } },
  { key: 'damage', file: 'damage.jpg', from: b.damage.start - 0.9, to: b.damage.end + 0.15, fadeIn: 0.3, fadeOut: 0.5, kb: { s: [ 1.17, 1.05 ], x: [ -10, 8 ], y: [ 0, 18 ] } },
  { key: 'toll', file: 'toll.jpg', from: b.toll.start - 0.1, to: b.toll.end + 0.15, fadeIn: 0.35, fadeOut: 0.5, kb: { s: [ 1.05, 1.17 ], x: [ 12, -10 ], y: [ 0, -14 ] } },
  // Callback to the opening picture (no new image): darker, different crop.
  { key: 'old', file: 'hook.jpg', from: b.old.start - 0.1, to: b.old.end + 0.15, fadeIn: 0.4, fadeOut: 0.5, dim: 0.35, kb: { s: [ 1.3, 1.18 ], x: [ -40, -10 ], y: [ -60, -30 ] } },
  { key: 'change', file: 'change.jpg', from: b.change.start - 0.1, to: b.change.end + 0.15, fadeIn: 0.35, fadeOut: 0.5, kb: { s: [ 1.17, 1.05 ], x: [ 0, 0 ], y: [ -22, 12 ] } }
];

const ShotLayer: React.FC<{ shot: Shot; children?: ( t: number ) => React.ReactNode }> = ( { shot, children } ) => {
  const frame = useCurrentFrame();
  const n = Math.round( ( shot.to - shot.from ) * FPS );
  const o = Math.min( shot.fadeIn > 0 ? interpolate( frame, [ 0, shot.fadeIn * FPS ], [ 0, 1 ], { extrapolateRight: 'clamp' } ) : 1, interpolate( frame, [ n - shot.fadeOut * FPS, n ], [ 1, 0 ], { extrapolateLeft: 'clamp' } ) );
  const k = ( [ a, b ]: [ number, number ] ) => interpolate( frame, [ 0, n ], [ a, b ], { extrapolateRight: 'clamp' } );
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ overflow: 'hidden', background: '#05070d' }}>
        <Img src={staticFile( `exp-northridge-cinematic/${ shot.file }` )} style={{ width: 1080, height: 1920, objectFit: 'cover', transform: `translate(${ k( shot.kb.x ) }px, ${ k( shot.kb.y ) }px) scale(${ k( shot.kb.s ) })`, filter: shot.dim ? `brightness(${ shot.dim })` : undefined }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.62) 0%, rgba(5,7,13,0) 30%, rgba(5,7,13,0) 55%, rgba(5,7,13,0.7) 100%)' }} />
      {children ? children( shot.from + frame / FPS ) : null}
    </AbsoluteFill>
  );
};

/** Inner composition keeps its audio and visuals; only its on-screen captions are blanked (they are redrawn above the images). */
const innerAudio = ( audio: EduAudio ): EduAudio => ( { ...audio, captions: [ { text: ' ', start: 900, end: 901 } ] } );

export const NorthridgeCinematic: React.FC<{ audio: EduAudio }> = ( { audio } ) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = audioBeats( audio );
  const shots = shotsFor( b );
  const shot = ( key: string ) => shots.find( s => s.key === key )!;
  const card = ( key: string, node: ( t: number ) => React.ReactNode ) => (
    <Sequence key={key} from={Math.round( shot( key ).from * FPS )} durationInFrames={Math.round( ( shot( key ).to - shot( key ).from ) * FPS )} layout="none">
      <ShotLayer shot={shot( key )}>{node}</ShotLayer>
    </Sequence>
  );
  const svg = ( n: React.ReactNode ) => <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>{n}</svg>;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <HistoricNorthridge1994 audio={innerAudio( audio )} />
      {card( 'hook', tt => <HistoricTitle lines={[ 'NORTHRIDGE 1994', 'EARTHQUAKE' ]} size={92} opacity={Math.min( 1, vis( tt, -1, b.date.start + 0.2, 0.5 ) )} /> )}
      {card( 'date', tt => svg(
        <>
          <Card x={60} y={1020} w={540} label="DATE · LOCAL TIME" value="JAN 17, 1994" valueSize={62} note="4:30 AM · Pacific Standard Time" opacity={vis( tt, b.date.start + 0.2, b.mag.start + 0.9, 0.4 )} color="#ffffff" />
          <Card x={620} y={1020} w={400} label="MAGNITUDE · USGS" value="6.7" valueSize={110} opacity={vis( tt, b.mag.start - 0.05, b.mag.start + 0.9, 0.3 )} />
        </>
      ) )}
      {card( 'rupture', tt => svg( <Card x={60} y={1020} w={960} label="SANTA SUSANA MOUNTAINS · USGS" value="UP TO 70 CM" valueSize={96} note="Uplift · AI cutaway is illustrative, see diagram" opacity={vis( tt, b.rupture.start + 2.0, b.rupture.end + 0.1, 0.4 )} color="#cdbfa0" /> ) )}
      {card( 'damage', () => null )}
      {card( 'toll', tt => svg( <Card x={60} y={1020} w={960} label="NORTHRIDGE EARTHQUAKE" value="DOZENS KILLED · THOUSANDS INJURED" valueSize={46} note="Counts vary by source" opacity={vis( tt, b.toll.start, b.toll.end + 0.1, 0.4 )} color="#cfd6e4" /> ) )}
      {card( 'old', tt => svg( <Card x={60} y={1020} w={960} label="COLLAPSED FREEWAY STRUCTURES" value="OLDER DESIGNS" valueSize={90} note="Many were built before modern seismic standards" opacity={vis( tt, b.old.start, b.old.end + 0.1, 0.4 )} color="#FFB800" /> ) )}
      {card( 'change', tt => svg( <Card x={60} y={1020} w={960} label="CALIFORNIA RESPONSE" value="BRIDGE RETROFITS" valueSize={84} note="Caltrans retrofit program · building codes updated" opacity={vis( tt, b.change.start, b.change.end + 0.1, 0.4 )} color="#7FDBFF" /> ) )}
      <Captions t={t} captions={audio.captions} />
    </AbsoluteFill>
  );
};

export const totalFrames = ( audio: EduAudio ) => episodeSeconds( HISTORIC.northridge1994, audio ) * FPS;
export const cinematicPropsSchema = z.object( { audio: eduAudioSchema } );
