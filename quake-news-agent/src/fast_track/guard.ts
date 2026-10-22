import { checkDraft } from '../workflows/quake_news/validation.js';
import type { QuakeFacts } from '../workflows/quake_news/types.js';
import type { VideoText } from './templates.js';

/**
 * Runs the M1 deterministic fact check over the fast-track title and description. Contradictions and unsupported
 * claims (including any casualty or damage language not framed as a PAGER model estimate) block publication. The
 * article-shape rules (word counts, required mentions) are for news drafts and do not apply to a YouTube description.
 */
export function checkVideoText( facts: QuakeFacts, text: VideoText, narration: string ): string[] {
  const body = text.description.split( '\n\n' ).filter( p => !/^(Official event page:|#)/.test( p ) ).join( '\n\n' );
  const report = checkDraft( facts, { headline: text.title, dek: text.title, article: body, narration } );
  return [ ...report.contradictions, ...report.unsupportedClaims ];
}
