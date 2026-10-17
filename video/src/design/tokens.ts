/**
 * Cinematic Breaking News design tokens. Every component takes its colors and type from here.
 * tokens.spec.ts checks text contrast and the minimum font size.
 */
import type { CSSProperties } from 'react';

export const COLORS = {
  /** Navy-black page background. */
  background: '#070B14',
  /** Opaque panel behind data and cards. */
  panel: '#0E1522',
  panelTranslucent: 'rgba(14, 21, 34, 0.92)',
  charcoal: '#1A2230',
  rule: '#2A3548',
  text: '#F4F6FA',
  textSecondary: '#A9B4C6',
  /** Brighter secondary for text that must be read on a phone: caveats, timestamps, attribution, data details. */
  textSupport: '#CBD3DF',
  /** Seismic red: tag blocks, rules, large display text. */
  red: '#D7202A',
  /** Lighter red for small red text on dark backgrounds, where #E5242B lacks contrast. */
  redText: '#FF5A5F',
  /** Marker and glow only (matches the spike's epicenter overlay). */
  redHot: '#FF3B30',
  /** Reserved for the preliminary notice. */
  amber: '#F2A900',
  /** Text on the amber badge. */
  onAmber: '#1A1200'
} as const;

/**
 * Terrain map palette (M2.2b, `b1-cool`, chosen at checkpoint B1): blue-grey land on a navy ocean. Value hierarchy:
 * land > continental shelf > deep ocean; the coastline is the brightest map edge. Ramps are [elevation in m, color].
 * Used by src/map/terrainStyle.ts; tokens.spec.ts checks the hierarchy and credit-text contrast over the map.
 */
export const MAP_COLORS = {
  /** Background and the shelf (0 to -200 m); also the bathymetry's -200 m stop, so the seam is invisible. */
  shelf: '#0A1D31',
  /** Deeper than -200 m, darkening with depth; nearly flat below -3000 m (abyssal plains, survey tracks). */
  deep: [ [ -1000, '#08182A' ], [ -3000, '#050F1F' ], [ -6000, '#030914' ], [ -9000, '#02040A' ] ] as [ number, string ][],
  land: '#232C38',
  /** Transparent at or below 150 m, so the DEM never draws a second coastline. */
  landTint: [ [ 150, 'rgba(0, 0, 0, 0)' ], [ 600, 'rgba(64, 72, 84, 0.45)' ], [ 1500, 'rgba(86, 94, 106, 0.55)' ], [ 3000, 'rgba(116, 124, 136, 0.65)' ], [ 5000, 'rgba(150, 158, 170, 0.75)' ] ] as [ number, string ][],
  landShadow: 'rgba(0, 0, 0, 0.7)',
  landHighlight: 'rgba(190, 210, 235, 0.30)',
  oceanShadow: 'rgba(0, 0, 0, 0.5)',
  oceanHighlight: 'rgba(140, 170, 210, 0.08)',
  coast: '#B4CDE6',
  coastGlow: '#3D6A9E',
  border: '#C9D2DE'
} as const;

/** PAGER level swatches. Used only as a color chip next to the level name. */
export const PAGER_COLORS = { green: '#2FB45A', yellow: '#F2D23C', orange: '#F28C28', red: '#E5242B' } as const;

export const FONT = {
  display: '"Barlow Condensed", sans-serif',
  ui: 'Inter, sans-serif'
} as const;

/** Nothing on screen is set smaller than this (1080 px wide canvas, read on a phone). */
export const MIN_FONT_PX = 30;

const display = ( weight: number, fontSize: number, extra: CSSProperties = {} ): CSSProperties =>
  ( { fontFamily: FONT.display, fontWeight: weight, fontSize, lineHeight: 1, textTransform: 'uppercase', ...extra } );
const ui = ( weight: number, fontSize: number, extra: CSSProperties = {} ): CSSProperties =>
  ( { fontFamily: FONT.ui, fontWeight: weight, fontSize, lineHeight: 1.25, fontFeatureSettings: '"tnum" 1', ...extra } );

export const TYPE = {
  magnitudeHero: display( 800, 440, { letterSpacing: -6, lineHeight: 0.86 } ),
  magnitudeCompact: display( 800, 60, { letterSpacing: 0 } ),
  headline: display( 700, 84, { letterSpacing: 1, lineHeight: 0.95 } ),
  title: display( 700, 64, { letterSpacing: 1 } ),
  cardValue: display( 800, 136, { letterSpacing: 0, lineHeight: 0.9 } ),
  dataValue: display( 700, 60, { letterSpacing: 0.5, textTransform: 'none' } ),
  kicker: display( 700, 40, { letterSpacing: 6 } ),
  tag: display( 700, 44, { letterSpacing: 5 } ),
  wordmark: display( 800, 100, { letterSpacing: 4 } ),
  body: ui( 600, 40 ),
  note: ui( 500, 36 ),
  label: ui( 600, 30, { letterSpacing: 3, textTransform: 'uppercase' } ),
  /** Timestamps, attribution and data details. */
  meta: ui( 500, 32 ),
  /** Least important lines (closing reference details). */
  fine: ui( 500, 30 ),
  tagline: display( 600, 54, { letterSpacing: 5 } )
} satisfies Record<string, CSSProperties>;

export type TypeStyle = keyof typeof TYPE;

/** Text/background pairs the components use, with the WCAG ratio each must meet (4.5 normal, 3 large bold). */
export const TEXT_PAIRS: { name: string; text: string; background: string; min: number }[] = [
  { name: 'text on background', text: COLORS.text, background: COLORS.background, min: 4.5 },
  { name: 'text on panel', text: COLORS.text, background: COLORS.panel, min: 4.5 },
  { name: 'secondary on background', text: COLORS.textSecondary, background: COLORS.background, min: 4.5 },
  { name: 'secondary on panel', text: COLORS.textSecondary, background: COLORS.panel, min: 4.5 },
  { name: 'support on background', text: COLORS.textSupport, background: COLORS.background, min: 4.5 },
  { name: 'support on panel', text: COLORS.textSupport, background: COLORS.panel, min: 4.5 },
  { name: 'secondary on charcoal', text: COLORS.textSecondary, background: COLORS.charcoal, min: 4.5 },
  { name: 'text on red tag', text: COLORS.text, background: COLORS.red, min: 4.5 },
  { name: 'red text on panel', text: COLORS.redText, background: COLORS.panel, min: 4.5 },
  { name: 'red text on background', text: COLORS.redText, background: COLORS.background, min: 4.5 },
  { name: 'text on amber badge', text: COLORS.onAmber, background: COLORS.amber, min: 4.5 },
  { name: 'large red display on background', text: COLORS.red, background: COLORS.background, min: 3 }
];
