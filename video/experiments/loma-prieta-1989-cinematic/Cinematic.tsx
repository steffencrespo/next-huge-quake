/**
 * Experiment: Loma Prieta 1989 with ten AI-generated (GPT Image 2.5 Sunburst via ElevenLabs) still images layered over the HistoricLomaPrieta1989 composition.
 * Same architecture as the Northridge 1994 cinematic: the inner composition keeps all audio (narration, Deified music, SFX) and the Bay Area map; its captions
 * are blanked and redrawn here above the images. Image windows follow the narration beats. Before and after: the early images are graded cooler and dimmer, the
 * demolition picture warms from grey to colour (the turning point), and the boulevard picture wipes over it. Nothing here is published.
 */
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { COLORS } from '../../src/design/tokens.js';
import { FPS } from '../../src/edu/EduShort.js';
import { audioBeats, episodeSeconds } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Pill, S_COLOR, Txt, vis } from '../../src/edu/kit.js';
import { eduAudioSchema } from '../../src/edu/narration.js';
import type { EduAudio } from '../../src/edu/narration.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { HISTORIC } from '../../src/historic/episodes.js';
import { HistoricLomaPrieta1989, mapWindow } from '../../src/historic/lomaprieta1989.js';
import { Card, HistoricTitle } from '../../src/historic/kit.js';

type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
type Shot = { key: string; file: string; from: number; to: number; fadeIn: number; fadeOut: number; kb: Kb; dim?: number; sat?: [ number, number ]; wipe?: number };

/** Staged copies live in public/exp-loma-prieta-cinematic/ (source names are the narration lines). Window = the narration the image illustrates. */
export const WIPE = 1.5;
export const shotsFor = ( b: Beats ): Shot[] => {
  const w = mapWindow( b );
  const afterFrom = b.after.start + 1.0;
  return [
    // Before: the freeway dominates the waterfront (cooler, dimmer grade).
    { key: 'hook', file: 'hook.png', from: 0, to: b.plan.end + 0.15, fadeIn: 0, fadeOut: 0.5, dim: 0.9, sat: [ 0.8, 0.8 ], kb: { s: [ 1.04, 1.2 ], x: [ 0, -14 ], y: [ 0, -30 ] } },
    { key: 'revolt', file: 'revolt.png', from: b.revolt.start - 0.15, to: b.revolt.end + 0.1, fadeIn: 0.35, fadeOut: 0.45, sat: [ 0.85, 0.85 ], kb: { s: [ 1.05, 1.17 ], x: [ -12, 8 ], y: [ 10, -14 ] } },
    { key: 'emb', file: 'emb.png', from: b.emb.start - 0.1, to: b.wall.end + 0.1, fadeIn: 0.35, fadeOut: 0.45, dim: 0.88, sat: [ 0.8, 0.8 ], kb: { s: [ 1.05, 1.2 ], x: [ 10, -12 ], y: [ 0, -24 ] } },
    // Callback to the same picture, darker and tighter on the concrete (voters kept it).
    { key: 'no', file: 'emb.png', from: b.no.start - 0.1, to: b.no.end + 0.1, fadeIn: 0.4, fadeOut: 0.45, dim: 0.62, sat: [ 0.6, 0.6 ], kb: { s: [ 1.38, 1.22 ], x: [ -50, -10 ], y: [ 50, 10 ] } },
    { key: 'date', file: 'date.png', from: b.date.start - 0.1, to: b.date.end + 0.25, fadeIn: 0.4, fadeOut: 0.4, kb: { s: [ 1.17, 1.04 ], x: [ -6, 10 ], y: [ 0, 14 ] } },
    // The Bay Area map (inner composition) fills the window between date and the Oakland picture.
    { key: 'cyp', file: 'cyp.png', from: w.to - 0.3, to: b.cyp.end + 0.2, fadeIn: 0.4, fadeOut: 0.45, kb: { s: [ 1.04, 1.17 ], x: [ 10, -10 ], y: [ 0, -12 ] } },
    { key: 'sf', file: 'sf.png', from: b.sf.start - 0.1, to: b.closed.end + 0.1, fadeIn: 0.4, fadeOut: 0.45, dim: 0.92, sat: [ 0.75, 0.75 ], kb: { s: [ 1.05, 1.2 ], x: [ 8, -14 ], y: [ 6, -10 ] } },
    { key: 'debate', file: 'debate.png', from: b.debate.start - 0.1, to: b.vote.end + 0.1, fadeIn: 0.4, fadeOut: 0.4, sat: [ 0.9, 0.9 ], kb: { s: [ 1.16, 1.05 ], x: [ 0, -8 ], y: [ 10, 0 ] } },
    // Turning point: slow push-in while the grade warms from grey to colour.
    { key: 'demo', file: 'demo.png', from: b.demo.start - 0.1, to: afterFrom + WIPE + 0.15, fadeIn: 0.4, fadeOut: 0.3, sat: [ 0.3, 1 ], kb: { s: [ 1.02, 1.16 ], x: [ 0, 6 ], y: [ 0, -10 ] } },
    // After: the boulevard wipes in over the demolition site and the freeway is gone.
    { key: 'after', file: 'after.png', from: afterFrom, to: b.people.end + 0.1, fadeIn: 0, fadeOut: 0.5, wipe: WIPE, kb: { s: [ 1.05, 1.17 ], x: [ 0, -8 ], y: [ 10, -6 ] } },
    { key: 'central', file: 'after.png', from: b.people.end - 0.05, to: b.central.end + 0.1, fadeIn: 0.5, fadeOut: 0.5, kb: { s: [ 1.4, 1.22 ], x: [ -90, -40 ], y: [ -170, -90 ] } },
    { key: 'end', file: 'end.png', from: b.nature.start - 0.1, to: b.cta.start - 0.5, fadeIn: 0.8, fadeOut: 0.5, kb: { s: [ 1.2, 1.04 ], x: [ 0, 0 ], y: [ -24, 10 ] } }
  ];
};

const ShotLayer: React.FC<{ shot: Shot; children?: ( t: number ) => React.ReactNode }> = ( { shot, children } ) => {
  const frame = useCurrentFrame();
  const n = Math.round( ( shot.to - shot.from ) * FPS );
  const o = Math.min( shot.fadeIn > 0 ? interpolate( frame, [ 0, shot.fadeIn * FPS ], [ 0, 1 ], { extrapolateRight: 'clamp' } ) : 1, interpolate( frame, [ n - shot.fadeOut * FPS, n ], [ 1, 0 ], { extrapolateLeft: 'clamp' } ) );
  const k = ( [ a, b ]: [ number, number ] ) => interpolate( frame, [ 0, n ], [ a, b ], { extrapolateRight: 'clamp' } );
  // Grade changes follow the whole shot; a wipe reveals the picture left to right with a soft edge.
  const wx = shot.wipe ? interpolate( frame, [ 0, shot.wipe * FPS ], [ -18, 100 ], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } ) : null;
  const mask = wx === null ? undefined : `linear-gradient(90deg, #000 ${ wx }%, transparent ${ wx + 18 }%)`;
  const filter = [ shot.dim ? `brightness(${ shot.dim })` : '', shot.sat ? `saturate(${ k( shot.sat ) })` : '' ].filter( Boolean ).join( ' ' ) || undefined;
  return (
    <AbsoluteFill style={{ opacity: o, WebkitMaskImage: mask, maskImage: mask }}>
      <AbsoluteFill style={{ overflow: 'hidden', background: '#05070d' }}>
        <Img src={staticFile( `exp-loma-prieta-cinematic/${ shot.file }` )} style={{ width: 1080, height: 1920, objectFit: 'cover', transform: `translate(${ k( shot.kb.x ) }px, ${ k( shot.kb.y ) }px) scale(${ k( shot.kb.s ) })`, filter }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.62) 0%, rgba(5,7,13,0) 30%, rgba(5,7,13,0) 55%, rgba(5,7,13,0.7) 100%)' }} />
      {children ? children( shot.from + frame / FPS ) : null}
    </AbsoluteFill>
  );
};

/** Inner composition keeps its audio and the map; only its on-screen captions are blanked (they are redrawn above the images). */
const innerAudio = ( audio: EduAudio ): EduAudio => ( { ...audio, captions: [ { text: ' ', start: 900, end: 901 } ] } );

export const LomaPrietaCinematic: React.FC<{ audio: EduAudio }> = ( { audio } ) => {
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
  const wide = ( tt: number, from: string, to: string, label: string, value: string, size: number, note: string, color: string, extra = 0.1 ) => (
    <Card x={60} y={1020} w={960} label={label} value={value} valueSize={size} note={note} opacity={vis( tt, b[from].start, b[to].end + extra, 0.4 )} color={color} />
  );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <HistoricLomaPrieta1989 audio={innerAudio( audio )} />
      {card( 'hook', tt => (
        <>
          <HistoricTitle lines={[ 'LOMA PRIETA 1989', 'EARTHQUAKE' ]} size={88} opacity={Math.min( 1, vis( tt, -1, b.plan.start - 0.2, 0.5 ) )} />
          {svg( wide( tt, 'plan', 'plan', 'SAN FRANCISCO TRAFFICWAYS PLAN', '10 FREEWAYS', 96, 'Proposed 1948 · adopted 1951', '#ffffff' ) )}
        </>
      ) )}
      {card( 'revolt', tt => svg( wide( tt, 'revolt', 'revolt', 'BOARD OF SUPERVISORS · 1959', 'MOST CANCELED', 84, 'Sources cite seven of ten planned routes', '#ffffff' ) ) )}
      {card( 'emb', tt => svg(
        <>
          {wide( tt, 'emb', 'emb', 'EMBARCADERO FREEWAY · SAN FRANCISCO', 'DOUBLE-DECKER', 80, 'Built along the waterfront in the 1950s', S_COLOR )}
          {wide( tt, 'wall', 'wall', 'THE STUB', 'ENDED AT BROADWAY', 68, 'Never reached the Golden Gate Bridge', S_COLOR )}
        </>
      ) )}
      {card( 'no', tt => svg( wide( tt, 'no', 'no', '1980S BALLOT', 'VOTERS SAID NO', 84, 'Removal rejected by nearly two to one', '#ffffff' ) ) )}
      {card( 'date', tt => svg( wide( tt, 'date', 'date', 'TUESDAY · PACIFIC DAYLIGHT TIME', '5:04 PM · OCT 17, 1989', 62, 'Loma Prieta earthquake', COLORS.redHot ) ) )}
      {card( 'cyp', tt => svg(
        <>
          <Pill x={290} y={345} text="OAKLAND · EAST BAY" color={S_COLOR} size={30} opacity={vis( tt, b.cyp.start - 0.4, b.cyp.end + 0.1, 0.4 )} />
          {wide( tt, 'cyp', 'cyp', 'CYPRESS STREET VIADUCT · OAKLAND', 'COLLAPSED', 100, 'More than 40 died here · USGS, Caltrans', S_COLOR )}
        </>
      ) )}
      {card( 'sf', tt => svg(
        <>
          <Pill x={330} y={345} text="SAN FRANCISCO" color="#7FDBFF" size={30} opacity={vis( tt, b.sf.start - 0.1, b.closed.end + 0.1, 0.4 )} />
          {wide( tt, 'sf', 'sf', 'EMBARCADERO FREEWAY · SAN FRANCISCO', 'DAMAGED · CLOSED', 66, 'It did not collapse', '#7FDBFF' )}
          {wide( tt, 'closed', 'closed', 'AFTER THE EARTHQUAKE', 'REPAIR OR REMOVE?', 66, 'State favored repair · mayor favored removal', '#ffffff' )}
        </>
      ) )}
      {card( 'debate', tt => svg(
        <>
          {wide( tt, 'debate', 'debate', 'CHINATOWN MERCHANTS', 'FEARED LOST CUSTOMERS', 58, 'Business-loss claims remain disputed', '#ffffff' )}
          <Card x={60} y={1020} w={960} label="BOARD OF SUPERVISORS" value="6–5 TO DEMOLISH" valueSize={84} note="Embarcadero Freeway · San Francisco" opacity={vis( tt, b.vote.start, b.vote.end + 0.1, 0.4 )} color="#ffffff" />
        </>
      ) )}
      {card( 'demo', tt => svg( wide( tt, 'demo', 'demo', 'EMBARCADERO FREEWAY', 'DEMOLITION BEGAN', 74, 'February 1991', '#FFB800', 1.0 ) ) )}
      {card( 'after', tt => svg( wide( tt, 'after', 'after', 'THE EMBARCADERO TODAY', 'FREEWAY GONE', 90, 'Boulevard, streetcars and the Ferry Building', '#7FDBFF' ) ) )}
      {card( 'central', tt => svg( wide( tt, 'central', 'central', 'CENTRAL FREEWAY · HAYES VALLEY', 'OCTAVIA BOULEVARD', 62, 'Opened 2005 · new housing on freed land', '#7FDBFF' ) ) )}
      {card( 'end', tt => svg( <Txt x={72} y={345} size={30} anchor="start" weight={700} spacing={2} color="#cfd6e4" opacity={0.9 * vis( tt, b.nature.start, b.nature.end + 0.2, 0.5 )}>LOMA PRIETA · OCT 17, 1989 · 63 LIVES LOST · USGS</Txt> ) )}
      <Captions t={t} captions={audio.captions} />
    </AbsoluteFill>
  );
};

export const totalFrames = ( audio: EduAudio ) => episodeSeconds( HISTORIC.lomaprieta1989, audio ) * FPS;
export const cinematicPropsSchema = z.object( { audio: eduAudioSchema } );
