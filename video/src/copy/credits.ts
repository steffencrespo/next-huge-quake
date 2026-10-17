/**
 * Map data credits: the single source for on-screen credit lines and the complete attribution exported with a video.
 *
 * Verified for M2.2b (Gate B) against:
 * - tilezen/joerd docs/attribution.md, the terms the AWS Open Data registry gives for Terrain Tiles. Its "Required
 *   attribution" list (TERRAIN_REQUIRED_ATTRIBUTION, verbatim) applies to the tiles as a product; "Mapzen" is added
 *   when using Mapzen's former hosted service, and is credited here as the tiles' producer. Attribution must "appear
 *   in a place that is reasonable to the medium".
 * - Open Government Licence - Canada: include the attribution statement and, where possible, a link to the licence.
 * - Natural Earth: public domain, no attribution required (credited as a courtesy).
 *
 * For video, the short on-screen lines are not the complete attribution. Every published video must carry
 * `fullCredits()` in its public description (or end credits); technical documentation alone is not sufficient.
 */

export type MapCredits = 'natural-earth' | 'terrain';

/** On-screen lines (M2.2b D2). They contain no numbers, so the copy guard needs no exceptions. */
export const ON_SCREEN_CREDITS: Record<MapCredits, { providers: string; footer: string; closing: string }> = {
  'natural-earth': { providers: 'Natural Earth', footer: 'Map: Natural Earth', closing: 'Map data: Natural Earth' },
  terrain: { providers: 'Natural Earth, Mapzen', footer: 'Terrain: Mapzen', closing: 'Map data: Natural Earth · Terrain: Mapzen' }
};

export const TERRAIN_DATASET = {
  name: 'Terrain Tiles (Mapzen / Tilezen Joerd), AWS Open Data Registry',
  registry: 'https://registry.opendata.aws/terrain-tiles/',
  attributionDoc: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
  dataSourcesDoc: 'https://github.com/tilezen/joerd/blob/master/docs/data-sources.md'
} as const;

export const OGL_CANADA_URL = 'https://open.canada.ca/en/open-government-licence-canada';

/** Joerd's "Required attribution" list, verbatim (retrieved 2026-10-17). */
export const TERRAIN_REQUIRED_ATTRIBUTION = [
  'ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736;',
  'Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;',
  'Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich;',
  'Canada terrain data contains information licensed under the Open Government Licence – Canada;',
  'Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers;',
  'Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration',
  'Mexico terrain data source: INEGI, Continental relief, 2016;',
  'New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved);',
  'Norway terrain data © Kartverket;',
  'United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved;',
  'United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.'
] as const;

/**
 * Sources that actually contribute at the prepared zooms (z0-z8, see docs/data-sources.md), recorded for the manifest
 * and documentation. The exported credits still list the complete required attribution above: the obligation is
 * stated for the dataset, and per-tile provenance is not tracked (M2.2b D3).
 */
export const TERRAIN_SOURCES_AT_PREPARED_ZOOMS = [
  { source: 'ETOPO1', provider: 'NOAA NCEI', zooms: 'ocean z0-z8, land z0-z3', terms: 'public domain; credit requested' },
  { source: 'GMTED2010', provider: 'USGS', zooms: 'land z4-z6; z7-z8 above 60° latitude', terms: 'public domain; credit requested' },
  { source: 'SRTM', provider: 'NASA / USGS', zooms: 'land z7-z8', terms: 'public domain; credit requested' },
  { source: 'NRCAN CDEM', provider: 'Natural Resources Canada', zooms: 'Canada, z7-z8', terms: 'Open Government Licence - Canada; attribution statement required' }
] as const;

/** The complete credits block for a video's public description and for documentation. */
export function fullCredits( credits: MapCredits ): string {
  const lines = [
    'Earthquake data: U.S. Geological Survey (USGS), earthquake.usgs.gov.',
    'Map data: Made with Natural Earth (naturalearthdata.com), public domain.'
  ];
  if ( credits === 'terrain' ) {
    lines.push(
      `Terrain: ${TERRAIN_DATASET.name}, produced by Mapzen. Required attribution:`,
      ...TERRAIN_REQUIRED_ATTRIBUTION.map( line => `- ${line}` ),
      `Open Government Licence – Canada: ${OGL_CANADA_URL}`
    );
  }
  return lines.join( '\n' );
}
