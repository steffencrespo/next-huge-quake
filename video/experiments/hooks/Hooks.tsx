/**
 * DISPOSABLE opening-hook experiment (Vanuatu M6.0, us6000u3bc). Not part of the pipeline; reads the published
 * video's props.json and reuses the production terrain, chrome, copy, fonts and audio files. ~5 s each.
 */
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { musicGain } from '../../src/audio/soundtrack.js';
import { Chrome, SourceFooter } from '../../src/components/Chrome.js';
import { Scrim } from '../../src/components/Scrim.js';
import { SeismicGlyph } from '../../src/components/SeismicGlyph.js';
import { buildScreenCopy } from '../../src/copy/screenCopy.js';
import { fitFontSize } from '../../src/design/fit.js';
import { REGIONS, rectStyle } from '../../src/design/layout.js';
import { seismicTick, slideUp, wipeIn } from '../../src/design/motion.js';
import { COLORS, TYPE } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import { newsCameraAt } from '../../src/map/newsCamera.js';
import { productionMapStyle } from '../../src/map/productionMapStyle.js';
import { LowerThird } from '../../src/components/LowerThird.js';
import { videoSpecSchema } from '../../src/spec/schema.js';
import { EpicenterOverlay } from '../../src/spike/EpicenterOverlay.js';
import props from '../../out/videos/us6000u3bc/props.json';

const spec = videoSpecSchema.parse( props.spec );
const copy = buildScreenCopy( spec, { mapCredits: productionMapStyle.credits } );
const { event } = spec;
const target = { latitude: event.latitude, longitude: event.longitude, approachFrom: spec.map.approachFrom };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const OUT = Easing.out( Easing.cubic );
const INOUT = Easing.inOut( Easing.cubic );
const SHADOW = '0 6px 40px rgba(0,0,0,0.85)';
const DURATION = 5;
const COUNTRY = event.place.split( ',' ).pop()!.trim().toUpperCase();

/** Production camera sampled at whole production frames (so the prepared terrain tiles cover it). */
const camera = ( prodFrame: number, framed: boolean ) => {
  const c = newsCameraAt( Math.round( prodFrame ), target );
  return framed ? c : { ...c, padding: { top: 0, bottom: 0, left: 0, right: 0 } };
};

const Map: React.FC<{ prod: ( f: number ) => number; framed: boolean; ringsStart: number }> = ( { prod, framed, ringsStart } ) => (
  <LiveMap
    cameraAt={f => camera( prod( f ), framed )}
    epicenter={[ event.longitude, event.latitude ]}
    tiles="local"
    style={productionMapStyle.style}
    diagnostics={{ event: event.id, tiles: 'local', style: productionMapStyle.name }}
    background={COLORS.background}
    overlay={( marker, f ) => <EpicenterOverlay frame={f} x={marker.x} y={marker.y} start={ringsStart} />}
  />
);

/** Reused music + (optional) narration excerpt. `from` is the narration offset in seconds, `at` the video start. */
const Sound: React.FC<{ voice?: { from: number; to: number; at: number } }> = ( { voice } ) => {
  const gainSource = voice ? { narrationStart: voice.at, narrationDuration: voice.to - voice.from } : { narrationStart: 99, narrationDuration: 1 };
  return (
    <>
      <Audio src={staticFile( 'audio/exp-deified.mp3' )} volume={f => musicGain( f / 30, gainSource, DURATION )} />
      {voice ? (
        <Sequence from={Math.round( voice.at * 30 )} layout="none">
          <Audio
            src={staticFile( 'audio/exp-vanuatu-narration.mp3' )}
            startFrom={Math.round( voice.from * 30 )}
            endAt={Math.round( voice.to * 30 )}
            volume={f => interpolate( f, [ 0, Math.round( ( voice.to - voice.from ) * 30 ) - 5, Math.round( ( voice.to - voice.from ) * 30 ) ], [ 1, 1, 0 ], clamp )}
          />
        </Sequence>
      ) : null}
    </>
  );
};

const Shell: React.FC<{ scrim?: number; magnitude?: string | null; children: React.ReactNode }> = ( { children } ) => (
  <AbsoluteFill style={{ background: COLORS.background }}>{children}</AbsoluteFill>
);

/* ------------------------------------------------------------------ A: Immediate impact */

const A_MOVE = { start: 46, end: 74 } as const;
const COMPACT_TARGET = { x: 888, y: REGIONS.chrome.y + 9 };

export const HookA: React.FC = () => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const move = interpolate( frame, [ A_MOVE.start, A_MOVE.end ], [ 0, 1 ], { ...clamp, easing: INOUT } );
  const punch = interpolate( frame, [ 0, 9 ], [ 1.14, 1 ], { ...clamp, easing: OUT } );
  const flash = interpolate( frame, [ 0, 7 ], [ 0.4, 0 ], clamp );
  const originY = REGIONS.hook.y + 250;
  const originX = REGIONS.hook.x + REGIONS.hook.width / 2;
  const scale = punch * ( 1 + ( 60 / 440 - 1 ) * move );
  const place = COUNTRY;
  const fade = ( a: number, b: number ) => interpolate( frame, [ a, b ], [ 1, 0 ], clamp );
  const tick = seismicTick( frame, 74 );
  return (
    <Shell scrim={interpolate( frame, [ 46, 80 ], [ 0.7, 1 ], clamp )} magnitude={frame >= 74 ? copy.hook.magnitude : null}>
      <div style={{ position: 'absolute', inset: 0 }}><Map prod={f => f * 1.3} framed ringsStart={95} /></div>
      <Scrim strength={interpolate( frame, [ 46, 80 ], [ 0.7, 1 ], clamp )} />
      <Chrome chrome={copy.chrome} magnitude={frame >= 76 ? copy.hook.magnitude : null} />
      {frame < 80 ? (
        <div style={{ ...rectStyle( REGIONS.hook ), display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: SHADOW, transformOrigin: `50% 250px`, transform: `translate(${( COMPACT_TARGET.x - originX ) * move}px, ${( COMPACT_TARGET.y - originY ) * move}px) scale(${scale})`, opacity: interpolate( frame, [ 70, 80 ], [ 1, 0 ], clamp ) }}>
          <div style={{ ...TYPE.kicker, fontSize: 56, letterSpacing: 18, color: COLORS.redText, opacity: fade( 46, 58 ) }}>{copy.hook.kicker}</div>
          <div style={{ ...TYPE.magnitudeHero, fontSize: 470, color: COLORS.text, marginTop: 6 }}>{copy.hook.magnitude}</div>
          <div style={{ width: 760, height: 12, background: COLORS.red, marginTop: 30, opacity: fade( 46, 58 ) }} />
          <div style={{ ...TYPE.headline, fontSize: fitFontSize( place, REGIONS.hook.width, 190, 90 ), color: COLORS.text, marginTop: 26, whiteSpace: 'nowrap', opacity: fade( 54, 66 ) }}>{place}</div>
        </div>
      ) : null}
      {frame >= 74 ? (
        <>
          <div style={{ position: 'absolute', left: REGIONS.lowerThird.x, top: REGIONS.lowerThird.y + 48, width: REGIONS.lowerThird.width, height: 8, background: COLORS.red, transformOrigin: 'left', transform: `scaleX(${tick.scaleX})`, opacity: tick.opacity }} />
          <LowerThird copy={copy.facts.lowerThird} style={wipeIn( frame, 77, 10 )} />
        </>
      ) : null}
      <AbsoluteFill style={{ background: COLORS.redHot, opacity: flash, mixBlendMode: 'screen' }} />
      <SourceFooter text={copy.chrome.source} />
      <Sound voice={{ from: 0, to: 4.8, at: 0.15 }} />
    </Shell>
  );
};

export const HookD: React.FC = () => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const move = interpolate( frame, [ A_MOVE.start, A_MOVE.end ], [ 0, 1 ], { ...clamp, easing: INOUT } );
  const punch = interpolate( frame, [ 0, 9 ], [ 1.14, 1 ], { ...clamp, easing: OUT } );
  const flash = interpolate( frame, [ 0, 7 ], [ 0.4, 0 ], clamp );
  const originY = REGIONS.hook.y + 250;
  const originX = REGIONS.hook.x + REGIONS.hook.width / 2;
  const scale = punch * ( 1 + ( 60 / 440 - 1 ) * move );
  const place = COUNTRY;
  const fade = ( a: number, b: number ) => interpolate( frame, [ a, b ], [ 1, 0 ], clamp );
  const tick = seismicTick( frame, 74 );
  return (
    <Shell scrim={interpolate( frame, [ 46, 80 ], [ 0.7, 1 ], clamp )} magnitude={frame >= 74 ? copy.hook.magnitude : null}>
      <div style={{ position: 'absolute', inset: 0 }}><Map prod={f => f * 1.3} framed ringsStart={95} /></div>
      <Scrim strength={interpolate( frame, [ 46, 80 ], [ 0.7, 1 ], clamp )} />
      <Chrome chrome={copy.chrome} magnitude={frame >= 76 ? copy.hook.magnitude : null} />
      {frame < 80 ? (
        <div style={{ ...rectStyle( REGIONS.hook ), display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: SHADOW, transformOrigin: `50% 250px`, transform: `translate(${( COMPACT_TARGET.x - originX ) * move}px, ${( COMPACT_TARGET.y - originY ) * move}px) scale(${scale})`, opacity: interpolate( frame, [ 70, 80 ], [ 1, 0 ], clamp ) }}>
          <div style={{ ...TYPE.kicker, fontSize: 56, letterSpacing: 18, color: COLORS.redText, opacity: fade( 46, 58 ) }}>{copy.hook.kicker}</div>
          <div style={{ ...TYPE.magnitudeHero, fontSize: 470, color: COLORS.text, marginTop: 6 }}>{copy.hook.magnitude}</div>
          <div style={{ width: 760, height: 12, background: COLORS.red, marginTop: 30, opacity: fade( 46, 58 ) }} />
          <div style={{ ...TYPE.headline, fontSize: fitFontSize( place, REGIONS.hook.width, 190, 90 ), color: COLORS.text, marginTop: 26, whiteSpace: 'nowrap', opacity: fade( 54, 66 ) }}>{place}</div>
        </div>
      ) : null}
      {frame >= 74 ? (
        <>
          <div style={{ position: 'absolute', left: REGIONS.lowerThird.x, top: REGIONS.lowerThird.y + 48, width: REGIONS.lowerThird.width, height: 8, background: COLORS.red, transformOrigin: 'left', transform: `scaleX(${tick.scaleX})`, opacity: tick.opacity }} />
          <LowerThird copy={copy.facts.lowerThird} style={wipeIn( frame, 77, 10 )} />
        </>
      ) : null}
      <AbsoluteFill style={{ background: COLORS.red, opacity: interpolate( frame, [ 0, 6, 26 ], [ 0.6, 0.6, 0 ], clamp ), mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ background: COLORS.redHot, opacity: flash, mixBlendMode: 'screen' }} />
      {frame < 72 ? (
        <div style={{ position: 'absolute', left: REGIONS.hook.x, top: 430, width: REGIONS.hook.width, height: 110, background: COLORS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: 'left', transform: `scaleX(${interpolate( frame, [ 0, 6 ], [ 0.3, 1 ], { ...clamp, easing: OUT } )})`, opacity: fade( 50, 64 ) }}>
          <span style={{ ...TYPE.tag, fontSize: 76, letterSpacing: 8, color: COLORS.text }}>EARTHQUAKE REPORTED</span>
        </div>
      ) : null}
      <SourceFooter text={copy.chrome.source} />
      <Sound voice={{ from: 0, to: 4.8, at: 0.15 }} />
    </Shell>
  );
};

/* ------------------------------------------------------------------ B: Factual suspense */

export const HookB: React.FC = () => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const place = COUNTRY;
  const reveal = 52;
  const tick = seismicTick( frame, reveal );
  const traceIn = interpolate( frame, [ 0, 44 ], [ 0, 100 ], { ...clamp, easing: Easing.linear } );
  const traceOut = interpolate( frame, [ reveal - 4, reveal + 4 ], [ 1, 0 ], clamp );
  const num = interpolate( frame, [ reveal, reveal + 8 ], [ 0, 1 ], { ...clamp, easing: OUT } );
  return (
    <Shell scrim={0.85}>
      <div style={{ position: 'absolute', inset: 0 }}><Map prod={f => 130 + f * 0.5} framed ringsStart={0} /></div>
      <Scrim strength={0.85} />
      <Chrome chrome={copy.chrome} />
      <div style={{ ...rectStyle( { ...REGIONS.hook, y: 920, height: 260 } ), display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: SHADOW }}>
        <div style={{ ...TYPE.kicker, fontSize: 48, letterSpacing: 14, color: COLORS.redText }}>EARTHQUAKE REPORTED</div>
        <div style={{ ...TYPE.headline, fontSize: fitFontSize( place, REGIONS.hook.width, 200, 90 ), color: COLORS.text, marginTop: 18, whiteSpace: 'nowrap' }}>{place}</div>
      </div>
      <div style={{ position: 'absolute', left: REGIONS.hook.x, top: 1150, width: REGIONS.hook.width, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: SHADOW }}>
        <div style={{ clipPath: `inset(0 ${100 - traceIn}% 0 0)`, opacity: traceOut, position: 'absolute', top: 40 }}>
          <SeismicGlyph width={REGIONS.hook.width} height={160} strokeWidth={9} />
        </div>
        {frame >= reveal ? (
          <>
            <div style={{ position: 'absolute', top: -14, width: REGIONS.hook.width, height: 8, background: COLORS.red, transformOrigin: 'left', transform: `scaleX(${tick.scaleX})`, opacity: tick.opacity }} />
            <div style={{ opacity: num, transform: `scale(${1.1 - 0.1 * num})`, display: 'flex', alignItems: 'baseline', gap: 28 }}>
              <span style={{ ...TYPE.kicker, fontSize: 52, letterSpacing: 12, color: COLORS.redText }}>{copy.hook.kicker}</span>
              <span style={{ ...TYPE.magnitudeHero, fontSize: 260, color: COLORS.text }}>{copy.hook.magnitude}</span>
            </div>
            <div style={{ ...TYPE.meta, color: COLORS.textSupport, marginTop: 4, opacity: interpolate( frame, [ reveal + 14, reveal + 26 ], [ 0, 1 ], clamp ) }}>USGS-reported · {copy.hook.when}</div>
          </>
        ) : null}
      </div>
      <SourceFooter text={copy.chrome.source} />
      <Sound />
    </Shell>
  );
};

/* ------------------------------------------------------------------ C: Scientific curiosity */

const SECTION = { x: REGIONS.hook.x, y: 905, width: REGIONS.hook.width, height: 560 };
const SCALE = { top: 1250, perKm: 2.9 };           // y for 0 km, px per km (70 km = 203 px)
const GX = SECTION.x + 330;                          // x of the epicenter line

export const HookC: React.FC = () => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const depth = event.depthKm ?? 10;
  const yAt = ( km: number ) => SCALE.top + km * SCALE.perKm;
  const drop = interpolate( frame, [ 14, 50 ], [ 0, 1 ], { ...clamp, easing: INOUT } );
  const band = interpolate( frame, [ 72, 96 ], [ 0, 1 ], { ...clamp, easing: OUT } );
  const pulse = 1 + 0.2 * Math.sin( ( frame / 15 ) * Math.PI );
  const marker = yAt( depth * drop );
  return (
    <Shell scrim={1}>
      <div style={{ position: 'absolute', inset: 0 }}><Map prod={f => 150 + f * 0.3} framed ringsStart={0} /></div>
      <Scrim strength={1} />
      <Chrome chrome={copy.chrome} magnitude={copy.hook.magnitude} />
      <div style={{ ...rectStyle( SECTION ), background: COLORS.panelTranslucent, borderLeft: `12px solid ${COLORS.red}`, boxSizing: 'border-box', ...slideUp( frame, 0, 24, 8 ) }}>
        <div style={{ padding: '14px 28px 0', textShadow: SHADOW }}>
          <div style={{ ...TYPE.label, color: COLORS.redText }}>{COUNTRY} · M {copy.hook.magnitude}</div>
          <div style={{ ...TYPE.magnitudeHero, fontSize: 190, lineHeight: 1, color: COLORS.text, marginTop: 4 }}>{depth} KM <span style={{ fontSize: 96, color: COLORS.textSupport }}>DEEP</span></div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        {/* ground: 0-70 km, darkening with depth */}
        <defs>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A4A63" />
            <stop offset="100%" stopColor="#141C2B" />
          </linearGradient>
        </defs>
        <rect x={SECTION.x + 28} y={yAt( 0 )} width={SECTION.width - 56} height={yAt( 70 ) - yAt( 0 )} fill="url(#ground)" opacity={0.95} />
        <line x1={SECTION.x + 28} x2={SECTION.x + SECTION.width - 28} y1={yAt( 0 )} y2={yAt( 0 )} stroke={COLORS.text} strokeWidth={5} />
        <text x={SECTION.x + 44} y={yAt( 0 ) - 12} fill={COLORS.textSupport} fontFamily="Inter, sans-serif" fontWeight={600} fontSize={30}>Surface · 0 km</text>
        {/* 10 km tick and 70 km bracket */}
        <line x1={GX} x2={GX} y1={yAt( 0 )} y2={marker} stroke={COLORS.redHot} strokeWidth={6} strokeDasharray="4 12" strokeLinecap="round" />
        <circle cx={GX} cy={marker} r={34 * pulse} fill={COLORS.redHot} opacity={0.3 * drop} />
        <circle cx={GX} cy={marker} r={16} fill={COLORS.redHot} stroke={COLORS.text} strokeWidth={4} />
        <text x={GX + 40} y={marker + 11} fill={COLORS.text} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={34} opacity={drop}>{depth} km · where it began</text>
        <g opacity={band}>
          <line x1={SECTION.x + SECTION.width - 90} x2={SECTION.x + SECTION.width - 90} y1={yAt( 0 )} y2={yAt( 70 )} stroke={COLORS.textSupport} strokeWidth={4} />
          <line x1={SECTION.x + SECTION.width - 110} x2={SECTION.x + SECTION.width - 70} y1={yAt( 70 )} y2={yAt( 70 )} stroke={COLORS.textSupport} strokeWidth={4} />
          <text x={SECTION.x + SECTION.width - 108} y={yAt( 35 ) - 8} fill={COLORS.text} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={32} textAnchor="end">USGS “shallow”</text>
          <text x={SECTION.x + SECTION.width - 108} y={yAt( 35 ) + 30} fill={COLORS.text} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={32} textAnchor="end">0–70 km</text>
        </g>
      </svg>
      <SourceFooter text={copy.chrome.source} />
      <Sound voice={{ from: 10.75, to: 15.6, at: 0.1 }} />
    </Shell>
  );
};
