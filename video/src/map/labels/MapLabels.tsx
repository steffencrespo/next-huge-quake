/**
 * Geographic labels overlay (M2.2c). Draws a precomputed LabelPlan at the anchors' real `map.project` positions for the
 * current frame (from LiveMap's `trackPoints`), so labels move with the map exactly like the epicenter marker.
 *
 * Labels fade in at the start of the plan's frame window. After layout, one LABELDIAG line per frame logs each label's
 * rendered box (DOM measured) for scripts/check-labels.ts. `debug` draws the allowed area, the exclusion disk and each
 * label's estimated box for the review stills.
 */
import { useLayoutEffect, useRef } from 'react';
import { interpolate } from 'remotion';
import { FONT } from '../../design/tokens.js';
import type { Marker } from '../LiveMap.js';
import { CITY_DOT, LABEL_TYPE } from './selectLabels.js';
import type { LabelPlan, PlannedLabel } from './selectLabels.js';

const WIDTH = 1080;
const HEIGHT = 1920;
const FADE_FRAMES = 15;
const DIAG_PREFIX = 'LABELDIAG ';
const HALO = '0 0 6px rgba(3, 7, 14, 0.95), 0 0 14px rgba(3, 7, 14, 0.85), 0 2px 3px rgba(3, 7, 14, 0.9)';

export const LABEL_COLORS = { country: '#E6ECF3', sea: '#9FC3E6', city: '#FFFFFF' } as const;

function textStyle( label: PlannedLabel ): React.CSSProperties {
  const t = LABEL_TYPE[label.kind];
  return {
    fontFamily: t.family === 'display' ? FONT.display : FONT.ui,
    fontWeight: t.weight,
    fontSize: label.fontSize,
    lineHeight: 1.1,
    letterSpacing: t.letterSpacing,
    color: LABEL_COLORS[label.kind],
    opacity: label.kind === 'country' ? 0.92 : 1,
    textShadow: HALO,
    whiteSpace: 'nowrap',
    textAlign: label.align === 'center' ? 'center' : label.align === 'right' ? 'left' : 'right'
  };
}

const Label: React.FC<{ label: PlannedLabel; at: Marker; index: number }> = ( { label, at, index } ) => {
  if ( label.kind !== 'city' ) {
    return (
      <div data-label={index} style={{ position: 'absolute', left: at.x, top: at.y, transform: 'translate(-50%, -50%)', ...textStyle( label ) }}>
        {label.lines.map( ( line, i ) => <div key={i}>{line}</div> )}
      </div>
    );
  }
  const d = CITY_DOT.radius;
  const right = label.align === 'right';
  return (
    <div data-label={index} style={{ position: 'absolute', left: right ? at.x - d : undefined, right: right ? undefined : WIDTH - at.x - d, top: at.y, transform: 'translateY(-50%)', display: 'flex', flexDirection: right ? 'row' : 'row-reverse', alignItems: 'center', gap: CITY_DOT.gap }}>
      <div style={{ width: 2 * d, height: 2 * d, borderRadius: d, background: '#FFFFFF', boxShadow: '0 0 0 2px rgba(3, 7, 14, 0.9), 0 0 8px rgba(3, 7, 14, 0.8)', flexShrink: 0 }} />
      <div style={textStyle( label )}>{label.lines[0]}</div>
    </div>
  );
};

export const MapLabels: React.FC<{ plan: LabelPlan; frame: number; points?: Marker[]; marker: Marker; debug?: boolean }> = ( { plan, frame, points, marker, debug = false } ) => {
  const container = useRef<HTMLDivElement>( null );
  const start = plan.frames[0] ?? Infinity;
  const opacity = interpolate( frame, [ start, start + FADE_FRAMES ], [ 0, 1 ], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } );
  const visible = points !== undefined && points.length === plan.labels.length && frame >= start;

  useLayoutEffect( () => {
    if ( !visible || !container.current ) {
      return;
    }
    const origin = container.current.getBoundingClientRect();
    const scale = origin.width / WIDTH;
    const boxes = plan.labels.map( ( label, i ) => {
      const r = container.current!.querySelector( `[data-label="${i}"]` )!.getBoundingClientRect();
      return { kind: label.kind, name: label.name, anchor: [ points![i].x, points![i].y ], box: [ ( r.left - origin.left ) / scale, ( r.top - origin.top ) / scale, ( r.right - origin.left ) / scale, ( r.bottom - origin.top ) / scale ] };
    } );
    console.log( DIAG_PREFIX + JSON.stringify( { frame, marker: [ marker.x, marker.y ], labels: boxes } ) );
  } );

  const { zone, exclusionRadius, margin } = plan.rules;
  return (
    <div ref={container} style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, pointerEvents: 'none' }}>
      {debug ? (
        <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0 }}>
          <rect x={zone.left} y={zone.top} width={zone.right - zone.left} height={zone.bottom - zone.top} fill="none" stroke="#38D9F5" strokeWidth={2} strokeDasharray="10 8" />
          <rect x={zone.left + margin} y={zone.top + margin} width={zone.right - zone.left - 2 * margin} height={zone.bottom - zone.top - 2 * margin} fill="none" stroke="#38D9F5" strokeOpacity={0.5} strokeWidth={1} />
          <circle cx={marker.x} cy={marker.y} r={exclusionRadius} fill="rgba(255, 60, 60, 0.08)" stroke="#FF5A5F" strokeWidth={2} strokeDasharray="10 8" />
          <circle cx={marker.x} cy={marker.y} r={exclusionRadius + margin} fill="none" stroke="#FF5A5F" strokeOpacity={0.5} strokeWidth={1} />
          {visible ? plan.labels.map( ( label, i ) => (
            <rect key={i} x={points![i].x + label.box.left} y={points![i].y + label.box.top} width={label.box.right - label.box.left} height={label.box.bottom - label.box.top} fill="none" stroke="#F2D23C" strokeWidth={2} />
          ) ) : null}
          <text x={zone.left + 8} y={zone.top - 10} fill="#38D9F5" fontFamily="Inter, sans-serif" fontSize={22}>allowed area (inner line: margin {margin} px)</text>
          <text x={zone.left + 8} y={zone.bottom + 30} fill="#FF5A5F" fontFamily="Inter, sans-serif" fontSize={22}>exclusion R = {exclusionRadius} px · yellow: estimated label boxes</text>
        </svg>
      ) : null}
      {visible ? (
        <div style={{ position: 'absolute', inset: 0, opacity }}>
          {plan.labels.map( ( label, i ) => <Label key={i} label={label} at={points![i]} index={i} /> )}
        </div>
      ) : null}
    </div>
  );
};
