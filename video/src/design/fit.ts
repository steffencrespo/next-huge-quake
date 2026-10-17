/**
 * Picks a font size so a single line of condensed display text fits a width.
 * Deterministic estimate from the character count (no DOM measuring), so every render tab agrees.
 * `emPerChar` is the average advance of uppercase Barlow Condensed Bold, measured at about 0.46 em.
 */
export function fitFontSize( text: string, width: number, max: number, min: number, emPerChar = 0.48 ): number {
  const fitted = Math.floor( width / ( Math.max( text.length, 1 ) * emPerChar ) );
  return Math.max( min, Math.min( max, fitted ) );
}
