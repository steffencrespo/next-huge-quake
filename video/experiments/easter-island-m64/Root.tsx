import { Composition } from 'remotion';
import { calculateEduMetadata, eduShortSchema } from '../../src/edu/EduShort.js';
import { EASTER_ISLAND_M64 } from './script.js';
import { EasterIslandM64 } from './EasterIslandM64.js';

export const Root: React.FC = () => (
  <Composition id="EasterIslandM64" component={EasterIslandM64} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( EASTER_ISLAND_M64 )} width={1080} height={1920} fps={30} durationInFrames={1080} defaultProps={{}} />
);
