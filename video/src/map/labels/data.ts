/**
 * Label data (M2.2c), prepared by scripts/build-geo.ts into public/geo/labels.json from Natural Earth v5.1.2
 * (public domain): populated places (1:10m), marine areas (1:50m) and countries (1:50m, via world-atlas).
 * Polygon rings are made longitude-continuous (they may extend past +/-180); see geo.ts.
 */
export type Place = {
  name: string;
  /** ASCII form, used only when `name` has a glyph outside the bundled fonts. */
  nameAscii: string;
  lon: number;
  lat: number;
  /** Natural Earth scalerank: 0 is most prominent. */
  scalerank: number;
  pop: number;
  capital: boolean;
};

export type Area = {
  name: string;
  /** [west, south, east, north]; west/east may extend past +/-180 for unwrapped rings. */
  bbox: [ number, number, number, number ];
  /** MultiPolygon coordinates: polygons → rings → [lon, lat]. */
  polygons: number[][][][];
};

export type LabelData = {
  source: string;
  places: Place[];
  countries: Area[];
  marine: Area[];
};

export const LABEL_DATA_FILE = 'geo/labels.json';
