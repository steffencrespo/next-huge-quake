/**
 * Deterministic label selection (M2.2c). Pure: the same event, camera and data always give the same labels.
 *
 * At most one country, one sea or ocean and one city, each optional; three is a maximum, not a target. A label is
 * kept only if, on every sampled frame of the window in which labels are visible, its box lies inside the allowed
 * area (the map zone inside the safe area), outside the exclusion disk around the epicenter marker (configurable), and
 * clear of the other labels. A label that does not fit is dropped, never squeezed or abbreviated.
 *
 * - Country and sea labels are centred on a point found by a coarse search of screen positions at the window's last
 *   frame, ordered by distance from the epicenter. Five sample points of the box (corners and centre) must lie in the
 *   named feature on every sampled frame. This is an approximation: it does not prove the whole box lies over the
 *   feature (a narrow inlet or headland between sample points can pass), so the visual review checks it.
 * - Country: only the country containing the epicenter; for an offshore epicenter, the nearest country with a valid
 *   position. Sea: only the marine area containing the epicenter; for an epicenter on land, the nearest one with a
 *   valid position.
 * - City: only an Admin-0 capital or a Natural Earth scalerank <= 5 place, never inside the exclusion disk (so the
 *   cities nearest the epicenter are never labelled), text on the side away from the epicenter, single line. Cities
 *   are neutral map references: no distance, no connecting line, nothing that relates them to shaking.
 */
import type { MapCamera } from '../LiveMap.js';
import type { Area, LabelData, Place } from './data.js';
import { areaAt, areaContains } from './geo.js';
import { projectAt, unprojectAt } from './projection.js';
import type { Point } from './projection.js';

export type LabelKind = 'country' | 'sea' | 'city';

/** Frames on which labels are visible and checked: from frame 300 (they fade in) to the start of Closing (900). */
export const LABEL_FRAMES = Array.from( { length: 13 }, ( _, i ) => 300 + i * 50 );

/**
 * Label typography. `emPerChar` is a deterministic width estimate: 0.5 em for uppercase Barlow Condensed (design/fit.ts
 * measured 0.46-0.48 em on average; C1 renders showed "MYANMAR" 2.7 px wider than 0.48 em, so wide letters need the
 * extra) and 0.6 em for mixed-case Inter. Rendered widths are logged and checked against it.
 */
export const LABEL_TYPE = {
  country: { family: 'display', weight: 700, sizes: [ 38, 34, 30 ], letterSpacing: 4, uppercase: true, emPerChar: 0.5, maxLines: 2 },
  sea: { family: 'display', weight: 600, sizes: [ 32, 30 ], letterSpacing: 5, uppercase: true, emPerChar: 0.5, maxLines: 2 },
  city: { family: 'ui', weight: 600, sizes: [ 32, 30 ], letterSpacing: 0, uppercase: false, emPerChar: 0.6, maxLines: 1 }
} as const;
const LINE_HEIGHT = 1.1;
/** City dot radius and the gap between dot and text. */
export const CITY_DOT = { radius: 6, gap: 12 };

export type LabelRules = {
  /** Radius (px) around the epicenter marker that no label may enter. Configurable (the rings change in M2.2e). */
  exclusionRadius: number;
  /** Extra clearance (px) on every rule, covering the projection model's error. */
  margin: number;
  /** Gap (px) between labels. */
  gap: number;
  /** Allowed area: the map zone between chrome and panels, inside the horizontal safe area. */
  zone: { left: number; right: number; top: number; bottom: number };
  /** Step (px) of the position search for country and sea labels. */
  searchStep: number;
};

export const DEFAULT_RULES: LabelRules = {
  exclusionRadius: 240,
  margin: 16,
  gap: 24,
  zone: { left: 72, right: 930, top: 450, bottom: 880 },
  searchStep: 20
};

/** Box offsets from the anchor's screen position, in px. */
export type Box = { left: number; top: number; right: number; bottom: number };

export type PlannedLabel = {
  kind: LabelKind;
  /** Display lines (already upper-cased for country and sea). */
  lines: string[];
  /** Natural Earth name, verbatim. */
  name: string;
  anchor: [ number, number ];
  fontSize: number;
  /** City text side; area labels are centred. */
  align: 'center' | 'left' | 'right';
  box: Box;
};

export type Rejection = { kind: LabelKind; name: string; reason: string };

export type LabelPlan = {
  labels: PlannedLabel[];
  rejected: Rejection[];
  rules: LabelRules;
  /** Frames on which the rules were checked. */
  frames: number[];
  epicenterCountry: string | null;
  epicenterSea: string | null;
};

export type SelectInput = {
  epicenter: [ number, number ];
  cameraAt: ( frame: number ) => MapCamera;
  /** Frames on which labels are visible; rules are checked on each (identical cameras are checked once). */
  frames: number[];
  data: LabelData;
  rules?: Partial<LabelRules>;
};

/** The bundled fonts' latin subset (fontsource unicode-range). */
const LATIN = [ [ 0x0000, 0x00ff ], [ 0x0131, 0x0131 ], [ 0x0152, 0x0153 ], [ 0x02bb, 0x02bc ], [ 0x02c6, 0x02c6 ], [ 0x02da, 0x02da ], [ 0x02dc, 0x02dc ], [ 0x2000, 0x206f ], [ 0x20ac, 0x20ac ], [ 0x2122, 0x2122 ], [ 0x2212, 0x2212 ] ];
export const inBundledFonts = ( text: string ) => [ ...text ].every( ch => LATIN.some( ( [ lo, hi ] ) => ch.codePointAt( 0 )! >= lo && ch.codePointAt( 0 )! <= hi ) );
/** Natural Earth name, or its ASCII form when a glyph is not in the bundled fonts. */
export const displayName = ( name: string, ascii: string ) => inBundledFonts( name ) ? name : ascii;

/** Single line, or the two-line split with the shortest longer line. */
function lineOptions( text: string, maxLines: number ): string[][] {
  const words = text.split( ' ' );
  const options = [ [ text ] ];
  if ( maxLines > 1 && words.length > 1 ) {
    const splits = words.slice( 1 ).map( ( _, i ) => [ words.slice( 0, i + 1 ).join( ' ' ), words.slice( i + 1 ).join( ' ' ) ] );
    splits.sort( ( a, b ) => Math.max( a[0].length, a[1].length ) - Math.max( b[0].length, b[1].length ) );
    options.push( splits[0] );
  }
  return options;
}

/** Deterministic text size estimate (no DOM measuring, so every render tab agrees). */
export function textSize( kind: LabelKind, lines: string[], fontSize: number ) {
  const t = LABEL_TYPE[kind];
  const width = Math.max( ...lines.map( l => l.length * ( fontSize * t.emPerChar + t.letterSpacing ) ) );
  return { width, height: lines.length * fontSize * LINE_HEIGHT };
}

const centredBox = ( w: number, h: number ): Box => ( { left: -w / 2, top: -h / 2, right: w / 2, bottom: h / 2 } );
const cityBox = ( w: number, h: number, align: 'left' | 'right' ): Box => {
  const reach = CITY_DOT.radius + CITY_DOT.gap + w;
  return align === 'right' ?
    { left: -CITY_DOT.radius, top: -h / 2, right: reach, bottom: h / 2 } :
    { left: -reach, top: -h / 2, right: CITY_DOT.radius, bottom: h / 2 };
};

type Rect = { x0: number; y0: number; x1: number; y1: number };
const at = ( p: Point, b: Box ): Rect => ( { x0: p.x + b.left, y0: p.y + b.top, x1: p.x + b.right, y1: p.y + b.bottom } );
const inside = ( r: Rect, z: LabelRules['zone'], m: number ) => r.x0 >= z.left + m && r.x1 <= z.right - m && r.y0 >= z.top + m && r.y1 <= z.bottom - m;
const clearOfDisk = ( r: Rect, c: Point, radius: number ) => {
  const dx = Math.max( r.x0 - c.x, 0, c.x - r.x1 );
  const dy = Math.max( r.y0 - c.y, 0, c.y - r.y1 );
  return dx * dx + dy * dy >= radius * radius;
};
const apart = ( a: Rect, b: Rect, gap: number ) => a.x1 + gap <= b.x0 || b.x1 + gap <= a.x0 || a.y1 + gap <= b.y0 || b.y1 + gap <= a.y0;
const samplePoints = ( r: Rect ): Point[] => [
  { x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x0, y: r.y1 }, { x: r.x1, y: r.y1 }, { x: ( r.x0 + r.x1 ) / 2, y: ( r.y0 + r.y1 ) / 2 }
];

export function selectLabels( { epicenter, cameraAt, frames, data, rules: overrides = {} }: SelectInput ): LabelPlan {
  const rules = { ...DEFAULT_RULES, ...overrides, zone: { ...DEFAULT_RULES.zone, ...overrides.zone } };
  // Distinct camera states on the window's frames; the last one is the reference for the position search.
  const cameras: MapCamera[] = [];
  for ( const frame of frames ) {
    const camera = cameraAt( frame );
    if ( !cameras.some( c => JSON.stringify( c ) === JSON.stringify( camera ) ) ) {
      cameras.push( camera );
    }
  }
  const reference = cameras[cameras.length - 1];
  const placed: { label: PlannedLabel; rects: Rect[] }[] = [];
  const rejected: Rejection[] = [];

  /** Screen rects of a label on every camera, or null if any rule fails. */
  const fits = ( anchor: [ number, number ], box: Box, feature?: ( lonLat: [ number, number ] ) => boolean ): Rect[] | null => {
    const rects: Rect[] = [];
    for ( const [ i, camera ] of cameras.entries() ) {
      const r = at( projectAt( camera, anchor ), box );
      if ( !inside( r, rules.zone, rules.margin ) || !clearOfDisk( r, projectAt( camera, epicenter ), rules.exclusionRadius + rules.margin ) ) {
        return null;
      }
      if ( placed.some( p => !apart( r, p.rects[i], rules.gap ) ) ) {
        return null;
      }
      if ( feature && !samplePoints( r ).every( p => feature( unprojectAt( camera, p ) ) ) ) {
        return null;
      }
      rects.push( r );
    }
    return rects;
  };

  // Search positions for area labels: allowed points at the reference camera, nearest the epicenter first.
  const marker = projectAt( reference, epicenter );
  const positions: Point[] = [];
  for ( let y = rules.zone.top; y <= rules.zone.bottom; y += rules.searchStep ) {
    for ( let x = rules.zone.left; x <= rules.zone.right; x += rules.searchStep ) {
      if ( Math.hypot( x - marker.x, y - marker.y ) > rules.exclusionRadius + rules.margin ) {
        positions.push( { x, y } );
      }
    }
  }
  positions.sort( ( a, b ) => Math.hypot( a.x - marker.x, a.y - marker.y ) - Math.hypot( b.x - marker.x, b.y - marker.y ) || a.y - b.y || a.x - b.x );

  const epicenterCountry = areaAt( data.countries, epicenter );
  const isWater = ( lonLat: [ number, number ] ) => !data.countries.some( c => areaContains( c, lonLat ) );
  const epicenterSea = epicenterCountry ? null : areaAt( data.marine, epicenter );

  /** Places an area label (country or sea) for the first feature with a valid position. */
  const placeArea = ( kind: 'country' | 'sea', pick: ( lonLat: [ number, number ] ) => Area | null, only: Area | null, fallbackAllowed: boolean ) => {
    for ( const pos of positions ) {
      const anchor = unprojectAt( reference, pos );
      const feature = pick( anchor );
      if ( !feature || ( only && feature !== only ) || ( !only && !fallbackAllowed ) ) {
        continue;
      }
      const name = displayName( feature.name, feature.name );
      if ( /\d/.test( name ) ) {
        rejected.push( { kind, name: feature.name, reason: 'contains digits' } );
        return;
      }
      const inFeature = kind === 'country' ?
        ( p: [ number, number ] ) => areaContains( feature, p ) :
        ( p: [ number, number ] ) => isWater( p ) && areaContains( feature, p );
      for ( const fontSize of LABEL_TYPE[kind].sizes ) {
        for ( const lines of lineOptions( name.toUpperCase(), LABEL_TYPE[kind].maxLines ) ) {
          const { width, height } = textSize( kind, lines, fontSize );
          const box = centredBox( width, height );
          const rects = fits( anchor, box, inFeature );
          if ( rects ) {
            placed.push( { label: { kind, lines, name: feature.name, anchor, fontSize, align: 'center', box }, rects } );
            return;
          }
        }
      }
    }
    const target = only?.name ?? ( kind === 'country' ? 'nearest country in view' : 'nearest sea in view' );
    rejected.push( { kind, name: target, reason: 'no position keeps the whole label clear of the exclusion disk, inside the allowed area and over the feature on every frame' } );
  };

  // 1. Country: the epicenter's country; offshore, the nearest country with a valid position.
  placeArea( 'country', p => areaAt( data.countries, p ), epicenterCountry, epicenterCountry === null );
  // 2. Sea: the epicenter's sea; on land, the nearest sea with a valid position.
  placeArea( 'sea', p => ( isWater( p ) ? areaAt( data.marine, p ) : null ), epicenterSea, epicenterSea === null );

  // 3. City: at most one eligible place.
  const visible = ( p: Place ) => {
    const s = projectAt( reference, [ p.lon, p.lat ] );
    return s.x >= 0 && s.x <= 1080 && s.y >= 0 && s.y <= 1920;
  };
  const candidates = data.places
    .filter( visible )
    .sort( ( a, b ) => Number( b.capital ) - Number( a.capital ) || a.scalerank - b.scalerank || b.pop - a.pop || a.name.localeCompare( b.name ) );
  let city: PlannedLabel | null = null;
  for ( const place of candidates ) {
    const name = displayName( place.name, place.nameAscii );
    if ( city ) {
      rejected.push( { kind: 'city', name: place.name, reason: 'one city at most' } );
      continue;
    }
    if ( !place.capital && place.scalerank > 5 ) {
      rejected.push( { kind: 'city', name: place.name, reason: `not eligible (scalerank ${place.scalerank})` } );
      continue;
    }
    if ( /\d/.test( name ) ) {
      rejected.push( { kind: 'city', name: place.name, reason: 'contains digits' } );
      continue;
    }
    const dot = projectAt( reference, [ place.lon, place.lat ] );
    if ( Math.hypot( dot.x - marker.x, dot.y - marker.y ) < rules.exclusionRadius + rules.margin ) {
      rejected.push( { kind: 'city', name: place.name, reason: 'inside the exclusion disk (too close to the epicenter marker)' } );
      continue;
    }
    const away: ( 'left' | 'right' )[] = dot.x < marker.x ? [ 'left', 'right' ] : [ 'right', 'left' ];
    for ( const fontSize of LABEL_TYPE.city.sizes ) {
      for ( const align of away ) {
        const { width, height } = textSize( 'city', [ name ], fontSize );
        const box = cityBox( width, height, align );
        const rects = fits( [ place.lon, place.lat ], box );
        if ( rects && !city ) {
          city = { kind: 'city', lines: [ name ], name: place.name, anchor: [ place.lon, place.lat ], fontSize, align, box };
          placed.push( { label: city, rects } );
        }
      }
    }
    if ( !city ) {
      rejected.push( { kind: 'city', name: place.name, reason: 'does not fit the allowed area on every frame' } );
    }
  }

  return {
    labels: placed.map( p => p.label ),
    rejected,
    rules,
    frames,
    epicenterCountry: epicenterCountry?.name ?? null,
    epicenterSea: epicenterSea?.name ?? null
  };
}
