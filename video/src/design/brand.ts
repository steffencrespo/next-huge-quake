/**
 * Channel identity. The only place the channel name appears: rebranding is a change to this file.
 */
export type Brand = {
  /** Full channel name, set as the wordmark. */
  name: string;
  /** Short form for tight spaces. */
  shortName: string;
  /** Draw the seismogram glyph beside the wordmark. */
  showGlyph: boolean;
  /** Optional line under the closing wordmark. Editorial copy: change only with review. */
  tagline: string | null;
};

export const BRAND: Brand = {
  name: 'NEXT HUGE QUAKE',
  shortName: 'NHQ',
  showGlyph: true,
  tagline: 'Stay informed. Stay prepared.'
};
