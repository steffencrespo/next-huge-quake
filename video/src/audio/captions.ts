/**
 * Alignment → phrase-level captions. Deterministic: the same alignment always gives the same captions.
 *
 * Input is ElevenLabs' character-level `alignment` (for the text exactly as sent, not `normalized_alignment`).
 * Words are the whitespace-separated runs; a word starts at its first character's start time and ends at its last
 * character's end time. Phrase rules, in order:
 *   - always break after a word ending in . ? ! (sentence end);
 *   - break after a word ending in , ; : once the phrase has MIN_WORDS_BEFORE_COMMA_BREAK words;
 *   - break before a word that would take the phrase past MAX_PHRASE_WORDS words or MAX_PHRASE_CHARS characters;
 *   - a one-word phrase left at the end of a sentence joins the phrase before it if the result still fits, otherwise
 *     it takes one word from it, so no caption is a single trailing word.
 * Dotted initialisms such as "U.S." do not end a sentence.
 * Inside a sentence a caption is held until the next one starts (no flicker); at a sentence end it ends with the speech.
 */
import { z } from 'zod';
import type { Caption } from './soundtrack.js';

export const alignmentSchema = z.object( {
  characters: z.array( z.string() ).min( 1 ),
  character_start_times_seconds: z.array( z.number().min( 0 ) ),
  character_end_times_seconds: z.array( z.number().min( 0 ) )
} );

export type Alignment = z.infer<typeof alignmentSchema>;

export const MAX_PHRASE_WORDS = 7;
export const MAX_PHRASE_CHARS = 44;
export const MIN_WORDS_BEFORE_COMMA_BREAK = 3;

type Word = { text: string; start: number; end: number };

const SENTENCE_END = /[.?!]["')\]]*$/;
/** Abbreviations whose full stop does not end a sentence: dotted initialisms (U.S., U.K.) and common titles. */
const ABBREVIATION = /^(?:(?:[A-Za-z]\.){2,}|(?:Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr)\.)$/;
const endsSentence = ( word: string ) => SENTENCE_END.test( word ) && !ABBREVIATION.test( word );
const SOFT_END = /[,;:]["')\]]*$/;

/** Checks the alignment is consistent with the text that was sent. Throws a clear error otherwise. */
export function validateAlignment( alignment: unknown, text: string ): Alignment {
  const parsed = alignmentSchema.safeParse( alignment );
  if ( !parsed.success ) {
    throw new Error( 'invalid alignment: missing or malformed character timing arrays' );
  }
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = parsed.data;
  if ( starts.length !== characters.length || ends.length !== characters.length ) {
    throw new Error( 'invalid alignment: character and timing arrays differ in length' );
  }
  if ( characters.join( '' ) !== text ) {
    throw new Error( 'invalid alignment: characters do not match the narration text that was sent' );
  }
  let previous = 0;
  for ( let i = 0; i < characters.length; i++ ) {
    if ( ends[i] < starts[i] || starts[i] < previous - 1e-6 ) {
      throw new Error( `invalid alignment: timing is not monotonic at character ${i}` );
    }
    previous = starts[i];
  }
  return parsed.data;
}

function toWords( { characters, character_start_times_seconds: starts, character_end_times_seconds: ends }: Alignment ): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;
  characters.forEach( ( char, i ) => {
    if ( /\s/.test( char ) ) {
      current = null;
    } else if ( current ) {
      current.text += char;
      current.end = ends[i];
    } else {
      current = { text: char, start: starts[i], end: ends[i] };
      words.push( current );
    }
  } );
  return words;
}

const chars = ( words: Word[] ) => words.map( w => w.text ).join( ' ' ).length;

export function alignmentToCaptions( alignment: Alignment ): Caption[] {
  const words = toWords( alignment );
  if ( words.length === 0 ) {
    throw new Error( 'invalid alignment: the narration has no words' );
  }
  const sentences: Word[][][] = [];
  let sentence: Word[][] = [];
  let phrase: Word[] = [];
  const closePhrase = () => {
    if ( phrase.length > 0 ) {
      sentence.push( phrase );
      phrase = [];
    }
  };
  for ( const word of words ) {
    if ( phrase.length > 0 && ( phrase.length + 1 > MAX_PHRASE_WORDS || chars( [ ...phrase, word ] ) > MAX_PHRASE_CHARS ) ) {
      // Never leave an abbreviation such as "U.S." at the end of a caption: it belongs with the next word.
      const carried = ABBREVIATION.test( phrase[phrase.length - 1].text ) && phrase.length > 1 ? phrase.pop()! : null;
      closePhrase();
      if ( carried ) {
        phrase.push( carried );
      }
    }
    phrase.push( word );
    if ( endsSentence( word.text ) ) {
      closePhrase();
      sentences.push( sentence );
      sentence = [];
    } else if ( SOFT_END.test( word.text ) && phrase.length >= MIN_WORDS_BEFORE_COMMA_BREAK ) {
      closePhrase();
    }
  }
  closePhrase();
  if ( sentence.length > 0 ) {
    sentences.push( sentence );
  }

  const items: Array<{ text: string; start: number; end: number; hold: boolean }> = [];
  for ( const phrases of sentences ) {
    const last = phrases[phrases.length - 1];
    const before = phrases[phrases.length - 2];
    if ( before && last.length === 1 && before.length + 1 <= MAX_PHRASE_WORDS && chars( [ ...before, ...last ] ) <= MAX_PHRASE_CHARS ) {
      phrases.splice( -2, 2, [ ...before, ...last ] );
    } else if ( before && last.length === 1 && before.length >= 3 ) {
      last.unshift( before.pop()! );
      while ( before.length > 2 && ABBREVIATION.test( before[before.length - 1].text ) ) {
        last.unshift( before.pop()! );
      }
    }
    phrases.forEach( ( p, i ) => items.push( {
      text: p.map( w => w.text ).join( ' ' ),
      start: p[0].start,
      end: p[p.length - 1].end,
      hold: i < phrases.length - 1
    } ) );
  }
  return items.map( ( item, i ) => {
    const end = item.hold ? items[i + 1].start : item.end;
    return { text: item.text, start: round( item.start ), end: round( Math.max( end, item.start + 0.001 ) ) };
  } );
}

const round = ( x: number ) => Math.round( x * 1000 ) / 1000;
