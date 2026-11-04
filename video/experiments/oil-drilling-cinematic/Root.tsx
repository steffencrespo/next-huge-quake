import { Composition } from 'remotion';
import { OilDrillingCinematic, calculateOilDrillingMetadata, oilDrillingSchema } from './Cinematic.js';
import { OilDrillingTikTok, oilDrillingTikTokSchema } from './TikTok.js';

export const Root: React.FC = () => (
  <>
    <Composition id="OilDrillingCinematic" component={OilDrillingCinematic} schema={oilDrillingSchema} calculateMetadata={calculateOilDrillingMetadata} width={1080} height={1920} fps={30} durationInFrames={1200} defaultProps={{ present: [] }} />
    <Composition id="OilDrillingTikTok" component={OilDrillingTikTok} schema={oilDrillingTikTokSchema} calculateMetadata={calculateOilDrillingMetadata} width={1080} height={1920} fps={30} durationInFrames={1200} defaultProps={{ present: [] }} />
  </>
);
