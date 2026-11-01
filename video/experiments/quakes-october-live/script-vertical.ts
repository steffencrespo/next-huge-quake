/** Narration for the 9:16 Shorts/TikTok edit of the October 2026 loop. Same snapshot and figures as the approved landscape final:
 * every number comes from script-final.ts (data-final.json), and every line is a landscape line reused word for word, so the
 * cached clips are reused and paced with fast-beats. Regions 3 to 5 and "all other areas" are shown on screen, not spoken. */
import { LINES as FINAL_LINES, STRONGEST } from './script-final.js';
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

const line = ( id: string, gap = 0 ): ScriptLine => {
  const l = FINAL_LINES.find( x => x.id === id );
  if ( !l ) throw new Error( `no landscape line '${id}'` );
  return { id, text: l.text, start: 0, gap };
};

/** `gap` = pause kept after the line (fast-beats keepPauses): room for the replay, camera flights and card changes. */
export const LINES: ScriptLine[] = [
  { ...line( 'hook', 0.5 ), start: 0.25 },
  line( 'dots', 0.3 ),
  line( 'b0', 6.5 ),
  line( 'r0', 0.5 ),
  line( 'r1', 0.9 ),
  line( 'plate', 1.2 ),
  ...STRONGEST.map( ( _, i ) => line( `c${i}`, 1.0 ) ),
  line( 'deep', 1.0 ),
  line( 's0' )
];

export const QUAKES_OCTOBER_VERTICAL: EpisodeMeta = { id: 'quakes-october-live-vertical', number: 98, compositionId: 'QuakesOctoberVertical', title: 'Earthquakes in October 2026', baseSeconds: 0, tailSeconds: 3.2, script: LINES };
