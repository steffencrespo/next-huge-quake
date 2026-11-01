import { Composition } from 'remotion';
import { calculateEduMetadata, eduShortSchema } from '../../src/edu/EduShort.js';
import { QUAKES_OCTOBER } from './script.js';
import { QuakesOctober } from './QuakesOctober.js';
import { QUAKES_OCTOBER_FINAL } from './script-final.js';
import { QuakesOctoberFinal } from './QuakesOctoberFinal.js';
import { QUAKES_OCTOBER_VERTICAL } from './script-vertical.js';
import { QuakesOctoberVertical } from './QuakesOctoberVertical.js';

export const Root: React.FC = () => (
  <>
    <Composition id="QuakesOctober" component={QuakesOctober} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( QUAKES_OCTOBER )} width={1080} height={1920} fps={30} durationInFrames={3600} defaultProps={{}} />
    <Composition id="QuakesOctoberFinal" component={QuakesOctoberFinal} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( QUAKES_OCTOBER_FINAL )} width={1920} height={1080} fps={30} durationInFrames={3600} defaultProps={{}} />
    <Composition id="QuakesOctoberVertical" component={QuakesOctoberVertical} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( QUAKES_OCTOBER_VERTICAL )} width={1080} height={1920} fps={30} durationInFrames={3600} defaultProps={{}} />
  </>
);
