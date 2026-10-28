import { Composition } from 'remotion';
import { FPS } from '../../src/edu/EduShort.js';
import { NorthridgeCinematic, cinematicPropsSchema, totalFrames } from './Cinematic.js';

export const Root: React.FC = () => (
  <Composition
    id="NorthridgeCinematic"
    component={NorthridgeCinematic}
    schema={cinematicPropsSchema}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={1800}
    defaultProps={{ audio: undefined as never }}
    calculateMetadata={( { props } ) => ( { durationInFrames: totalFrames( props.audio ) } )}
  />
);
