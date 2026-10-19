import { KIDS_MUSIC } from './config.js';

/** ElevenLabs bills the Multilingual and v3 models at 1 credit per character and the Flash and Turbo models at half that (check against the account's plan before approving). */
export const creditsPerCharacter = ( modelId: string ): number => ( /flash|turbo/i.test( modelId ) ? 0.5 : 1 );

/** Credits exported with the video: the music credit (given although not required) and the required Output.ai block. */
export const kidsCredits = ( narrated: boolean ): string => [
  'Music: ' + KIDS_MUSIC.credit,
  narrated ? 'Narration: ElevenLabs text-to-speech (Max).' : 'Narration: none yet (silent preview).',
  '',
  'Production Technology',
  'Automated news and video production powered by Output.ai',
  'https://output.ai',
  ''
].join( '\n' );
