import type { Soundtrack } from './soundtrack.js';

/**
 * Noto soundtrack. Caption text is the approved narration transcript, split into phrases. Times are seconds into
 * noto-narration.mp3 (30.75 s): each phrase starts at the first speech after a pause and ends at the next pause, as
 * found with ffmpeg silencedetect (-35 dB, 0.25 s) on the audio itself. Phrase breaks without a detected pause are
 * placed at the sentence's natural comma. Captions are held to the next phrase start only inside a sentence.
 */
export const notoSoundtrack: Soundtrack = {
  narrationFile: 'audio/noto-narration.mp3',
  musicFile: 'audio/legendary-kulakovka.mp3',
  narrationStart: 1.5,
  narrationDuration: 30.75,
  musicCredit: '"Legendary" by Kulakovka, Pixabay Content License. Source: https://pixabay.com/music/orchestral-legendary-608531/',
  captions: [
    { text: 'On January first, twenty twenty-four,', start: 0.05, end: 2.4 },
    { text: 'a powerful magnitude seven point five earthquake', start: 2.84, end: 5.92 },
    { text: 'struck Japan’s Noto Peninsula.', start: 6.2, end: 8.25 },
    { text: 'The quake triggered tsunami warnings,', start: 8.83, end: 10.81 },
    { text: 'damaged buildings and roads,', start: 11.13, end: 12.67 },
    { text: 'and caused widespread destruction across Ishikawa Prefecture.', start: 13.05, end: 16.82 },
    { text: 'The region sits along an active tectonic boundary,', start: 17.39, end: 20.05 },
    { text: 'where accumulated stress can be released in devastating earthquakes.', start: 20.5, end: 24.39 },
    { text: 'A reminder that seismic hazards remain a constant reality', start: 24.78, end: 28.27 },
    { text: '— and preparedness matters.', start: 28.7, end: 30.75 }
  ]
};
