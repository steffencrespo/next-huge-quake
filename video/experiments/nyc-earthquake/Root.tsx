import { Composition } from 'remotion';
import { calculateEduMetadata, eduShortSchema } from '../../src/edu/EduShort.js';
import { NYC_EARTHQUAKE } from './script.js';
import { NycEarthquake } from './NycEarthquake.js';

export const Root: React.FC = () => (
  <Composition id="NycEarthquake" component={NycEarthquake} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( NYC_EARTHQUAKE )} width={1080} height={1920} fps={30} durationInFrames={1560} defaultProps={{}} />
);
