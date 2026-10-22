import { Composition, Still } from 'remotion';
import { DesignBoard } from './compositions/DesignBoard.js';
import type { DesignBoardProps } from './compositions/DesignBoard.js';
import { QuakeNews, calculateQuakeNewsMetadata, quakeNewsSchema } from './compositions/QuakeNews.js';
import { TerrainSpike, calculateTerrainSpikeMetadata } from './compositions/TerrainSpike.js';
import type { TerrainSpikeProps } from './compositions/TerrainSpike.js';
import { DEMO_AS_OF_UTC, FIXTURES } from './fixtures/index.js';
import { buildVideoSpec } from './spec/build.js';
import { totalFrames } from './spec/timeline.js';
import { DURATION_FRAMES, FPS } from './spike/camera.js';
import { ScienceShort, calculateScienceShortMetadata, scienceShortSchema } from './edu/ScienceShort.js';
import { TOTAL_FRAMES } from './edu/geo.js';
import { calculateEduMetadata, eduShortSchema } from './edu/EduShort.js';
import { Predict } from './edu/ep02.js';
import { RingOfFire } from './edu/ep04.js';
import { Magnitude } from './edu/ep03.js';
import { DEPTH, EarthquakeDepth } from './edu/ep05.js';
import { CALIFORNIA, MythCaliforniaOcean } from './edu/ep06.js';
import { MythCaliforniaLoop, calculateLoopMetadata } from './edu/ep06loop.js';
import { KidsWhyEarthShakes, calculateKidsMetadata, kidsShortSchema } from './kids/KidsShort.js';
import { KidsDropCoverHold, calculateSafetyMetadata } from './kids/SafetyShort.js';
import { HistoricChile1960 } from './historic/chile1960.js';
import { HistoricJapan2011 } from './historic/japan2011.js';
import { HistoricSanFrancisco1906 } from './historic/sanfrancisco1906.js';
import { HISTORIC } from './historic/episodes.js';
import { MapSpike } from './spike/MapSpike.js';
import type { MapSpikeProps } from './spike/MapSpike.js';

/** Studio default; renders pass their own spec with --props (see scripts/render-news.ts). */
const defaultSpec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );

export const Root: React.FC = () => (
  <>
    <Composition
      id="QuakeNews"
      component={QuakeNews}
      schema={quakeNewsSchema}
      calculateMetadata={calculateQuakeNewsMetadata}
      width={defaultSpec.format.width}
      height={defaultSpec.format.height}
      fps={defaultSpec.format.fps}
      durationInFrames={totalFrames( defaultSpec )}
      defaultProps={{ spec: defaultSpec }}
    />
    <Composition
      id="MapSpike"
      component={MapSpike}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={DURATION_FRAMES}
      defaultProps={{ event: 'noto', tiles: 'local' } satisfies MapSpikeProps}
    />
    <Composition
      id="TerrainSpike"
      component={TerrainSpike}
      calculateMetadata={calculateTerrainSpikeMetadata}
      width={1080}
      height={1920}
      fps={defaultSpec.format.fps}
      durationInFrames={totalFrames( defaultSpec )}
      defaultProps={{ fixture: 'noto', style: 'terrain', chrome: false } satisfies TerrainSpikeProps}
    />
    <Composition id="WhyEarthquakes" component={ScienceShort} schema={scienceShortSchema} calculateMetadata={calculateScienceShortMetadata} width={1080} height={1920} fps={30} durationInFrames={TOTAL_FRAMES} defaultProps={{}} />
    <Composition id="WhyCantWePredict" component={Predict} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( 'predict' )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="RingOfFire" component={RingOfFire} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( 'ring' )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="MagnitudeSixVsSeven" component={Magnitude} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( 'magnitude' )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="EarthquakeDepth" component={EarthquakeDepth} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( DEPTH )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="MythCaliforniaLoop" component={MythCaliforniaLoop} schema={eduShortSchema} calculateMetadata={calculateLoopMetadata} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="MythCaliforniaOcean" component={MythCaliforniaOcean} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( CALIFORNIA )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="KidsWhyEarthShakes" component={KidsWhyEarthShakes} schema={kidsShortSchema} calculateMetadata={calculateKidsMetadata} width={1080} height={1920} fps={30} durationInFrames={1560} defaultProps={{}} />
    <Composition id="KidsWhyEarthShakesV2" component={KidsWhyEarthShakes} schema={kidsShortSchema} calculateMetadata={calculateKidsMetadata} width={1080} height={1920} fps={30} durationInFrames={1560} defaultProps={{ v2: true }} />
    <Composition id="KidsWhyEarthShakesShort" component={KidsWhyEarthShakes} schema={kidsShortSchema} calculateMetadata={calculateKidsMetadata} width={1080} height={1920} fps={30} durationInFrames={1260} defaultProps={{ v2: true, short: true }} />
    <Composition id="KidsDropCoverHold" component={KidsDropCoverHold} schema={kidsShortSchema} calculateMetadata={calculateSafetyMetadata} width={1080} height={1920} fps={30} durationInFrames={1260} defaultProps={{}} />
    <Composition id="HistoricChile1960" component={HistoricChile1960} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( HISTORIC.chile1960 )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="HistoricJapan2011" component={HistoricJapan2011} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( HISTORIC.japan2011 )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Composition id="HistoricSanFrancisco1906" component={HistoricSanFrancisco1906} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( HISTORIC.sanfrancisco1906 )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
    <Still
      id="DesignBoard"
      component={DesignBoard}
      width={1080}
      height={1920}
      defaultProps={{ board: 'hook', fixture: 'noto', card: 0 } satisfies DesignBoardProps}
    />
    <Composition
      id="DesignBoardLive"
      component={DesignBoard}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={DURATION_FRAMES}
      defaultProps={{ board: 'facts-live', fixture: 'noto', card: 0 } satisfies DesignBoardProps}
    />
  </>
);
