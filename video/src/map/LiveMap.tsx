/**
 * Reusable live map: MapLibre GL inside Remotion, extracted unchanged from the M2.0 spike (ADR 0002).
 *
 * - The camera is a pure function of the frame, applied with `jumpTo` only (no MapLibre animation).
 * - Per-frame readiness gate: apply the camera, force a repaint, wait for `idle` for that camera state, assert
 *   loaded/tiles/style, map errors and WebGL context, then `continueRender`. Any failure or timeout calls
 *   `cancelRender`, so a bad frame fails the render instead of reaching the MP4.
 * - Overlays are positioned with `map.project(epicenter)` after the frame's camera is applied.
 * - One MAPDIAG line per frame is logged for scripts/verify-render.ts.
 */
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, PaddingOptions, RequestParameters, ResourceType, StyleSpecification } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import type { CameraState } from '../spike/camera.js';
import { localStyle, remoteStyle } from '../spike/styles.js';
import type { TileMode } from '../spike/styles.js';

const WIDTH = 1080;
const HEIGHT = 1920;
const INIT_TIMEOUT_MS = 120_000;
const FRAME_TIMEOUT_MS = 30_000;
const DIAG_PREFIX = 'MAPDIAG ';
const TILE_REQUEST_PREFIX = 'TILEREQ ';

maplibregl.setWorkerUrl( new URL( staticFile( 'maplibre/maplibre-gl-worker.mjs' ), window.location.href ).href );
maplibregl.setWorkerCount( 2 );

/** A frame's camera. `padding` shifts where the center is drawn (e.g. to keep the epicenter above the panels). */
export type MapCamera = CameraState & { padding?: PaddingOptions };
export type Marker = { x: number; y: number };

export type LiveMapProps = {
  /** Pure function of the frame. Read through a ref, so a new function identity does not re-run the gate. */
  cameraAt: ( frame: number ) => MapCamera;
  /** [longitude, latitude] */
  epicenter: [ number, number ];
  tiles: TileMode;
  /**
   * Overrides `tiles` with a custom style (M2.2 terrain spike). With a style, every request must stay on the page
   * origin or one of `allowedHosts`; any other request is recorded as a map error, so the frame gate fails the render.
   * Raster-DEM tile requests are logged as TILEREQ lines for scripts/check-terrain-coverage.ts.
   */
  style?: () => StyleSpecification;
  allowedHosts?: string[];
  /** Extra fields for the MAPDIAG line (e.g. event and tiles), logged after `frame`. */
  diagnostics?: Record<string, unknown>;
  /** Drawn above `children` once the marker is known for this frame. */
  overlay?: ( marker: Marker, frame: number, tracked?: Marker[] ) => React.ReactNode;
  /**
   * Extra [longitude, latitude] points projected with `map.project` after each frame's camera (e.g. label anchors,
   * M2.2c). Passed to `overlay` once they belong to the current frame, and logged in the MAPDIAG line as `tracked`.
   */
  trackPoints?: [ number, number ][];
  /** Layers between the map and the overlay (e.g. a vignette). */
  children?: React.ReactNode;
  background?: string;
};

/**
 * Waits until the map has fully rendered the camera state that was just applied.
 * A repaint is forced first, so readiness always refers to this frame's camera, never the previous one.
 */
function waitForFrameReady( map: MapLibreMap, timeoutMs: number ): Promise<number> {
  const started = performance.now();
  return new Promise( ( resolve, reject ) => {
    const timer = setTimeout( () => {
      map.off( 'idle', onIdle );
      reject( new Error( `map not idle after ${timeoutMs} ms (tilesLoaded=${map.areTilesLoaded()}, styleLoaded=${map.isStyleLoaded()})` ) );
    }, timeoutMs );
    function onIdle() {
      clearTimeout( timer );
      resolve( performance.now() - started );
    }
    map.once( 'idle', onIdle );
    map.triggerRepaint();
  } );
}

/** Request guard for custom styles: same-origin (or allowed) requests only; DEM tile requests are logged. */
function guardRequests( allowedHosts: string[], errors: { current: string[] } ) {
  return ( url: string, resourceType?: ResourceType ): RequestParameters => {
    const parsed = new URL( url, window.location.href );
    // Custom protocols (e.g. local-dem://) are served by in-page handlers that fetch from the page origin.
    const local = parsed.origin === window.location.origin || ![ 'http:', 'https:' ].includes( parsed.protocol );
    if ( !local && !allowedHosts.includes( parsed.host ) ) {
      errors.current.push( `off-origin request blocked by policy: ${url}` );
      // Never let it reach the network: point it at a path the static server does not have.
      return { url: new URL( '/__blocked-off-origin-request__', window.location.href ).href };
    }
    const dem = /(terrain|terrarium)\/(\d+\/\d+\/\d+)\.png$/.exec( url );
    if ( resourceType === 'Tile' && dem ) {
      console.log( TILE_REQUEST_PREFIX + dem[2] );
    }
    return { url };
  };
}

export const LiveMap: React.FC<LiveMapProps> = ( { cameraAt, epicenter, tiles, style: customStyle, allowedHosts = [], diagnostics = {}, overlay, trackPoints, children, background = '#000' } ) => {
  const frame = useCurrentFrame();
  const containerRef = useRef<HTMLDivElement>( null );
  const [ map, setMap ] = useState<MapLibreMap | null>( null );
  const [ marker, setMarker ] = useState<Marker | null>( null );
  const [ tracked, setTracked ] = useState<{ frame: number; points: Marker[] } | null>( null );
  const errors = useRef<string[]>( [] );
  const contextLost = useRef( false );
  const [ initHandle ] = useState( () => delayRender( 'map-init', { timeoutInMilliseconds: INIT_TIMEOUT_MS } ) );
  const props = useRef( { cameraAt, epicenter, diagnostics, trackPoints } );
  props.current = { cameraAt, epicenter, diagnostics, trackPoints };

  useEffect( () => {
    let instance: MapLibreMap | undefined;
    let cancelled = false;
    ( async () => {
      const style = customStyle ? customStyle() : tiles === 'local' ? localStyle() : await remoteStyle();
      if ( cancelled || !containerRef.current ) {
        return;
      }
      // Padding is not a constructor option: set it before the style loads, so the first tile requests already use
      // the first frame's full camera (M2.2a: without it, a one-frame render loaded tiles for an unpadded view).
      const { padding, ...camera } = props.current.cameraAt( frame );
      const mapInstance = new maplibregl.Map( {
        container: containerRef.current,
        style,
        ...camera,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        pixelRatio: 1,
        maxPitch: 60,
        canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
        ...( customStyle ? { transformRequest: guardRequests( allowedHosts, errors ) } : {} )
      } );
      instance = mapInstance;
      if ( padding ) {
        mapInstance.setPadding( padding );
      }
      mapInstance.on( 'error', e => errors.current.push( String( e.error?.message ?? e.error ?? 'unknown map error' ) ) );
      mapInstance.getCanvas().addEventListener( 'webglcontextlost', () => {
        contextLost.current = true;
      } );
      mapInstance.once( 'load', () => {
        setMap( mapInstance );
        continueRender( initHandle );
      } );
    } )().catch( error => cancelRender( error ) );
    return () => {
      cancelled = true;
      instance?.remove();
    };
    // The map is created once per render tab; per-frame camera changes are applied below.
  }, [] );

  useLayoutEffect( () => {
    if ( !map ) {
      return;
    }
    const handle = delayRender( `map-frame-${frame}`, { timeoutInMilliseconds: FRAME_TIMEOUT_MS + 5_000 } );
    const { cameraAt: cameraFor, epicenter: point, diagnostics: extra } = props.current;
    const camera = cameraFor( frame );
    // Errors are never cleared: any error fails the render, including errors raised while the map was initializing,
    // before the first frame (M2.2a: clearing here discarded 404s of tiles requested during map load).
    map.jumpTo( camera );
    const projected = map.project( point );
    setMarker( { x: projected.x, y: projected.y } );
    const points = ( props.current.trackPoints ?? [] ).map( p => {
      const q = map.project( p );
      return { x: q.x, y: q.y };
    } );
    setTracked( { frame, points } );

    let active = true;
    waitForFrameReady( map, FRAME_TIMEOUT_MS ).then( waitMs => {
      if ( !active ) {
        return;
      }
      const ready = map.loaded() && map.areTilesLoaded() && map.isStyleLoaded();
      const gl = map.painter.context.gl;
      const lost = contextLost.current || gl.isContextLost();
      const after = map.project( point );
      const roundTrip = map.unproject( after );
      const center = map.getCenter();
      const diag = {
        frame,
        ...extra,
        waitMs: Math.round( waitMs ),
        ready,
        contextLost: lost,
        errors: errors.current,
        camera,
        appliedCenter: [ center.lng, center.lat ],
        appliedZoom: map.getZoom(),
        marker: [ projected.x, projected.y ],
        markerDriftPx: Math.hypot( after.x - projected.x, after.y - projected.y ),
        ...( points.length > 0 ? { tracked: points.map( q => [ q.x, q.y ] ) } : {} ),
        roundTripErrorDeg: Math.hypot( roundTrip.lng - point[0], roundTrip.lat - point[1] )
      };
      console.log( DIAG_PREFIX + JSON.stringify( diag ) );
      if ( !ready || lost || errors.current.length > 0 ) {
        cancelRender( new Error( `frame ${frame} not render-ready: ${JSON.stringify( diag )}` ) );
        return;
      }
      continueRender( handle );
    } ).catch( error => cancelRender( new Error( `frame ${frame}: ${( error as Error ).message}` ) ) );

    return () => {
      active = false;
      continueRender( handle );
    };
  }, [ map, frame ] );

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <div ref={containerRef} style={{ position: 'absolute', width: WIDTH, height: HEIGHT }} />
      {children}
      {marker && overlay ? overlay( marker, frame, tracked?.frame === frame ? tracked.points : undefined ) : null}
    </AbsoluteFill>
  );
};
