import { Composition } from 'remotion';
import { calculateEduMetadata, eduShortSchema } from '../../src/edu/EduShort.js';
import { NYC_TSUNAMI } from './script.js';
import { NycTsunami } from './NycTsunami.js';

export const Root: React.FC = () => (
  <Composition id="NycTsunami" component={NycTsunami} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( NYC_TSUNAMI )} width={1080} height={1920} fps={30} durationInFrames={1560} defaultProps={{}} />
);
