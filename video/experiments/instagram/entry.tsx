import { Composition, registerRoot } from 'remotion';
import { calculateEduMetadata, eduShortSchema, makeEduShort } from '../../src/edu/EduShort.js';
import { CALIFORNIA, CALIFORNIA_DEFINITION } from '../../src/edu/ep06.js';

/**
 * EXPERIMENT: the published "Will California Fall Into the Ocean?" Short for Instagram Reels. Same visuals, cues and
 * narration; the YouTube like/subscribe closing element is dropped (`Cta` renders nothing). Props come from build.mts.
 */
const Reel = makeEduShort( { ...CALIFORNIA_DEFINITION, Cta: () => null } );

const Root: React.FC = () => (
  <Composition id="CaliforniaReel" component={Reel} schema={eduShortSchema} calculateMetadata={calculateEduMetadata( CALIFORNIA )} width={1080} height={1920} fps={30} durationInFrames={1800} defaultProps={{}} />
);
registerRoot( Root );
