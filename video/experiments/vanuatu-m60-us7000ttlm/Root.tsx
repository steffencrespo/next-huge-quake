import { Composition } from 'remotion';
import { calculateEduMetadata, eduShortSchema } from '../../src/edu/EduShort.js';
import { VANUATU_SEQUENCE } from './script.js';
import { VanuatuSequence } from './VanuatuSequence.js';

export const Root: React.FC = () => (
  <Composition id="VanuatuSequence" component={VanuatuSequence} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( VANUATU_SEQUENCE )} width={1080} height={1920} fps={30} durationInFrames={1080} defaultProps={{}} />
);
