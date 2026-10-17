/**
 * Geographic test regions for M2.2c label selection: the fixtures, the terrain probes and an antimeridian case.
 * `box` ([west, south, east, north]) bounds the data clipped into the committed test sample; it covers the view at
 * the regional zooms with room to spare.
 */
import { FIXTURES } from '../../fixtures/index.js';
import type { CameraTarget } from '../../spike/camera.js';
import { TERRAIN_PROBES } from '../terrainProbes.js';

const region = ( target: CameraTarget ) => ( {
  target,
  box: [ target.longitude - 9, Math.max( -85, target.latitude - 7 ), target.longitude + 9, Math.min( 85, target.latitude + 7 ) ] as [ number, number, number, number ]
} );
const fixture = ( key: keyof typeof FIXTURES ): CameraTarget => ( { latitude: FIXTURES[key].event.latitude, longitude: FIXTURES[key].event.longitude, approachFrom: FIXTURES[key].approachFrom } );

export const LABEL_TEST_REGIONS = {
  noto: region( fixture( 'noto' ) ),
  kamchatka: region( fixture( 'kamchatka' ) ),
  ...Object.fromEntries( Object.entries( TERRAIN_PROBES ).map( ( [ k, t ] ) => [ k, region( t ) ] ) ),
  /** Synthetic: east of Fiji, just west of the antimeridian. */
  fijiEast: region( { latitude: -17.8, longitude: 179.9, approachFrom: 'west' } ),
  /** Synthetic: the same area seen from just east of the antimeridian. */
  fijiWest: region( { latitude: -17.8, longitude: -179.9, approachFrom: 'east' } )
} as Record<string, ReturnType<typeof region>>;
