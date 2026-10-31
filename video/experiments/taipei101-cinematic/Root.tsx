import { Composition } from 'remotion';
import { Taipei101Cinematic, calculateTaipei101Metadata, taipei101Schema } from './Cinematic.js';
import { Taipei101TikTok, taipei101TikTokSchema } from './TikTok.js';

export const Root: React.FC = () => (
  <>
    <Composition id="Taipei101Cinematic" component={Taipei101Cinematic} schema={taipei101Schema} calculateMetadata={calculateTaipei101Metadata} width={1080} height={1920} fps={30} durationInFrames={1200} defaultProps={{ present: [] }} />
    <Composition id="Taipei101TikTok" component={Taipei101TikTok} schema={taipei101TikTokSchema} calculateMetadata={calculateTaipei101Metadata} width={1080} height={1920} fps={30} durationInFrames={1200} defaultProps={{ present: [] }} />
  </>
);
