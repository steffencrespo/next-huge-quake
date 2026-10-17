/**
 * TerrainSpike (M2.2a, development only): renders the M2.1 style and the terrain candidate through the same code path,
 * at identical frames and camera states, for a fair A/B.
 *
 * - `chrome: true` (fixtures only): the full news video (QuakeNewsView), with the terrain style when `style` is
 *   'terrain'. With 'm21' it is exactly the production QuakeNews.
 * - `chrome: false`: the map layer alone (the same LiveMap, news camera and epicenter overlay as NewsMap), for judging
 *   the cartography. Probes are camera targets only and are marked "PROBE, NOT AN EVENT".
 * - `dem: 'discover'` reads DEM tiles from the published bucket instead of public/terrain/, to measure which tiles
 *   MapLibre requests along the camera path (development only; production renders are offline).
 */
import { AbsoluteFill, staticFile } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import type { FixtureKey } from '../fixtures/index.js';
import { COLORS, FONT } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { LiveMap } from '../map/LiveMap.js';
import type { NewsMapStyle } from '../map/NewsMap.js';
import { RINGS_START } from '../map/NewsMap.js';
import { HOLD_CAMERA, newsCameraAt } from '../map/newsCamera.js';
import { LABEL_DATA_FILE } from '../map/labels/data.js';
import type { LabelData } from '../map/labels/data.js';
import { MapLabels } from '../map/labels/MapLabels.js';
import { LABEL_FRAMES, selectLabels } from '../map/labels/selectLabels.js';
import type { LabelPlan } from '../map/labels/selectLabels.js';
import { TERRAIN_PROBES } from '../map/terrainProbes.js';
import type { ProbeKey } from '../map/terrainProbes.js';
import { localTerrainMapStyle } from '../map/productionMapStyle.js';
import { TERRAIN_TILES_REMOTE, terrainStyle, terrainStyleName } from '../map/terrainStyle.js';
import type { TerrainVariant } from '../map/terrainStyle.js';
import { buildVideoSpec } from '../spec/build.js';
import type { CameraTarget } from '../spike/camera.js';
import { EpicenterOverlay } from '../spike/EpicenterOverlay.js';
import { QuakeNewsView } from './QuakeNews.js';

export type TerrainSpikeProps = {
  fixture?: FixtureKey;
  probe?: ProbeKey;
  style: 'm21' | 'terrain';
  chrome: boolean;
  dem?: 'local' | 'discover';
  /** Terrain style candidate (default 'a1', the M2.2a style). */
  variant?: TerrainVariant;
  /** M2.2c camera experiment: 'hold' completes the slow push at frame 300 (map-only renders). Default: the M2.1 camera. */
  camera?: 'original' | 'hold';
  /** M2.2c geographic labels (map-only renders): selected once in calculateMetadata into `labelPlan`. */
  labels?: { exclusionRadius?: number; debug?: boolean };
  /** Derived by calculateTerrainSpikeMetadata; never passed by callers. */
  labelPlan?: LabelPlan;
};

const cameraOptions = ( camera: TerrainSpikeProps['camera'] ) => ( camera === 'hold' ? HOLD_CAMERA : {} );

/** Selects the labels once per render, from local Natural Earth data (public/geo/labels.json). */
export const calculateTerrainSpikeMetadata: CalculateMetadataFunction<TerrainSpikeProps> = async ( { props } ) => {
  if ( !props.labels || ( props.chrome && !props.probe ) ) {
    return { props };
  }
  const response = await fetch( staticFile( LABEL_DATA_FILE ) );
  if ( !response.ok ) {
    throw new Error( `label data missing (HTTP ${response.status}); run npm run build:geo` );
  }
  const data = await response.json() as LabelData;
  const { target } = targetOf( props );
  const labelPlan = selectLabels( {
    epicenter: [ target.longitude, target.latitude ],
    cameraAt: f => newsCameraAt( f, target, cameraOptions( props.camera ) ),
    frames: LABEL_FRAMES,
    data,
    rules: props.labels.exclusionRadius === undefined ? {} : { exclusionRadius: props.labels.exclusionRadius }
  } );
  return { props: { ...props, labelPlan } };
};

const resolve = ( path: string ) => new URL( staticFile( path ), window.location.href ).href;

function terrainMapStyle( dem: 'local' | 'discover', variant: TerrainVariant ): NewsMapStyle {
  return dem === 'discover' ?
    { name: `${terrainStyleName( variant )}-discover`, style: () => terrainStyle( { resolve, demTiles: TERRAIN_TILES_REMOTE, variant } ), allowedHosts: [ 's3.amazonaws.com' ], credits: 'terrain' } :
    localTerrainMapStyle( variant );
}

function targetOf( { fixture, probe }: TerrainSpikeProps ): { id: string; target: CameraTarget } {
  if ( probe ) {
    return { id: `probe-${probe}`, target: TERRAIN_PROBES[probe] };
  }
  const f = FIXTURES[fixture ?? 'noto'];
  return { id: f.event.id, target: { latitude: f.event.latitude, longitude: f.event.longitude, approachFrom: f.approachFrom } };
}

export const TerrainSpike: React.FC<TerrainSpikeProps> = props => {
  useBundledFonts();
  const { style, chrome, dem = 'local', variant = 'a1', fixture, probe, camera, labels, labelPlan } = props;
  const mapStyle = style === 'terrain' ? terrainMapStyle( dem, variant ) : undefined;

  if ( chrome && !probe ) {
    return <QuakeNewsView spec={buildVideoSpec( FIXTURES[fixture ?? 'noto'], { asOfUtc: DEMO_AS_OF_UTC } )} mapStyle={mapStyle} />;
  }
  const { id, target } = targetOf( props );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap
        cameraAt={f => newsCameraAt( f, target, cameraOptions( camera ) )}
        epicenter={[ target.longitude, target.latitude ]}
        tiles="local"
        style={mapStyle?.style}
        allowedHosts={mapStyle?.allowedHosts}
        diagnostics={{ event: id, tiles: 'local', style: mapStyle?.name ?? 'm21', camera: camera ?? 'original', ...( labelPlan ? { labels: labelPlan.labels.map( l => l.name ), exclusionRadius: labelPlan.rules.exclusionRadius } : {} ) }}
        background={COLORS.background}
        trackPoints={labelPlan?.labels.map( l => l.anchor )}
        overlay={( marker, f, tracked ) => (
          <>
            <EpicenterOverlay frame={f} x={marker.x} y={marker.y} start={RINGS_START} />
            {labelPlan ? <MapLabels plan={labelPlan} frame={f} points={tracked} marker={marker} debug={labels?.debug} /> : null}
          </>
        )}
      />
      {probe ? (
        <div style={{ position: 'absolute', left: 72, top: 120, fontFamily: FONT.ui, fontWeight: 600, fontSize: 30, color: '#CBD3DF' }}>
          PROBE, NOT AN EVENT · {TERRAIN_PROBES[probe].label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
