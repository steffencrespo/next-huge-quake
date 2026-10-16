import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { cameraAt } from './camera.js';
import { EpicenterOverlay } from './EpicenterOverlay.js';
import { EVENTS } from './events.js';
import type { EventKey } from './events.js';
import { MagnitudeHook } from './MagnitudeHook.js';
import { ATTRIBUTION, localStyle, remoteStyle } from './styles.js';
import type { TileMode } from './styles.js';

export type MapSpikeProps = { event: EventKey; tiles: TileMode };

const WIDTH = 1080;
const HEIGHT = 1920;
const INIT_TIMEOUT_MS = 120_000;
const FRAME_TIMEOUT_MS = 30_000;
const DIAG_PREFIX = 'MAPDIAG ';

maplibregl.setWorkerUrl( new URL( staticFile( 'maplibre/maplibre-gl-worker.mjs' ), window.location.href ).href );
maplibregl.setWorkerCount( 2 );

type Marker = { x: number; y: number };

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

export const MapSpike: React.FC<MapSpikeProps> = ( { event: eventKey, tiles } ) => {
  const frame = useCurrentFrame();
  const event = EVENTS[eventKey];
  const containerRef = useRef<HTMLDivElement>( null );
  const [ map, setMap ] = useState<MapLibreMap | null>( null );
  const [ marker, setMarker ] = useState<Marker | null>( null );
  const errors = useRef<string[]>( [] );
  const contextLost = useRef( false );
  const [ initHandle ] = useState( () => delayRender( 'map-init', { timeoutInMilliseconds: INIT_TIMEOUT_MS } ) );

  useEffect( () => {
    let instance: MapLibreMap | undefined;
    let cancelled = false;
    ( async () => {
      const style = tiles === 'local' ? localStyle() : await remoteStyle();
      if ( cancelled || !containerRef.current ) {
        return;
      }
      const camera = cameraAt( frame, event );
      const mapInstance = new maplibregl.Map( {
        container: containerRef.current,
        style,
        ...camera,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        pixelRatio: 1,
        maxPitch: 60,
        canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true }
      } );
      instance = mapInstance;
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
    const camera = cameraAt( frame, event );
    const epicenter: [ number, number ] = [ event.longitude, event.latitude ];
    errors.current = [];
    map.jumpTo( camera );
    const projected = map.project( epicenter );
    setMarker( { x: projected.x, y: projected.y } );

    let active = true;
    waitForFrameReady( map, FRAME_TIMEOUT_MS ).then( waitMs => {
      if ( !active ) {
        return;
      }
      const ready = map.loaded() && map.areTilesLoaded() && map.isStyleLoaded();
      const gl = map.painter.context.gl;
      const lost = contextLost.current || gl.isContextLost();
      const after = map.project( epicenter );
      const roundTrip = map.unproject( after );
      const center = map.getCenter();
      const diag = {
        frame,
        event: eventKey,
        tiles,
        waitMs: Math.round( waitMs ),
        ready,
        contextLost: lost,
        errors: errors.current,
        camera,
        appliedCenter: [ center.lng, center.lat ],
        appliedZoom: map.getZoom(),
        marker: [ projected.x, projected.y ],
        markerDriftPx: Math.hypot( after.x - projected.x, after.y - projected.y ),
        roundTripErrorDeg: Math.hypot( roundTrip.lng - epicenter[0], roundTrip.lat - epicenter[1] )
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
  }, [ map, frame, event, eventKey, tiles ] );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <div ref={containerRef} style={{ position: 'absolute', width: WIDTH, height: HEIGHT }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)' }} />
      {marker ? <EpicenterOverlay frame={frame} x={marker.x} y={marker.y} /> : null}
      <MagnitudeHook frame={frame} event={event} />
      <div style={{ position: 'absolute', left: 40, bottom: 48, fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
        {ATTRIBUTION[tiles]}
      </div>
    </AbsoluteFill>
  );
};
