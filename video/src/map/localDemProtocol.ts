/**
 * `local-dem://` protocol for the prepared DEM tiles (M2.2a).
 *
 * MapLibre 6 treats an HTTP 404 tile as "no data": it marks the tile errored without an `error` event, and
 * `areTilesLoaded()` counts errored tiles as loaded, so a missing DEM tile would silently render as a hole and pass
 * the readiness gate. This handler fetches the tile from public/terrain/ and throws a plain error (no 404 status) for
 * anything but a valid PNG, which MapLibre reports as a map error, so LiveMap's gate fails the render.
 */
import * as maplibregl from 'maplibre-gl';
import { staticFile } from 'remotion';

export const LOCAL_DEM_PROTOCOL = 'local-dem';
export const LOCAL_DEM_TILES = `${LOCAL_DEM_PROTOCOL}://terrain/{z}/{x}/{y}.png`;
const PNG_SIGNATURE = [ 0x89, 0x50, 0x4e, 0x47 ];

let registered = false;

export function registerLocalDemProtocol() {
  if ( registered ) {
    return;
  }
  registered = true;
  const base = new URL( staticFile( 'terrain' ), window.location.href ).href;
  maplibregl.addProtocol( LOCAL_DEM_PROTOCOL, async ( params, abortController ) => {
    const match = /(\d+)\/(\d+)\/(\d+)\.png$/.exec( params.url );
    if ( !match ) {
      throw new Error( `invalid DEM tile URL ${params.url}` );
    }
    const url = `${base}/${match[1]}/${match[2]}/${match[3]}.png`;
    const response = await fetch( url, { signal: abortController.signal } );
    const data = response.ok ? await response.arrayBuffer() : null;
    if ( !data || !PNG_SIGNATURE.every( ( byte, i ) => new Uint8Array( data, 0, 4 )[i] === byte ) ) {
      throw new Error( `DEM tile not prepared: ${match[1]}/${match[2]}/${match[3]} (HTTP ${response.status}); run prepare:terrain` );
    }
    return { data };
  } );
}
