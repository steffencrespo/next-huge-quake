/**
 * Music tracks allowed in renders. Every track here comes from the official YouTube Audio Library (no attribution
 * required, credited anyway). The Pixabay track "Legendary" by Kulakovka (audio/legendary-kulakovka.mp3) is retired:
 * Content ID matched it as "Legendary Rise" and blocked a published Short worldwide. The file stays on disk, unused.
 */
export type MusicTrack = { file: string; credit: string };

export const MUSIC = {
  deified: { file: 'audio/ytal-deified-the-grey-room.mp3', credit: '"Deified" by The Grey Room / Density & Time.\nSource: YouTube Audio Library.' },
  reviver: { file: 'audio/ytal-reviver-the-grey-room.mp3', credit: '"Reviver" by The Grey Room / Density & Time.\nSource: YouTube Audio Library.' }
} as const satisfies Record<string, MusicTrack>;

export type MusicKey = keyof typeof MUSIC;
export const DEFAULT_MUSIC: MusicKey = 'deified';

/** Never to be used by a render again. */
export const RETIRED_MUSIC_FILES = [ 'audio/legendary-kulakovka.mp3' ];
