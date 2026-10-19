import { DEFAULT_MUSIC, MUSIC } from './music.js';
import type { Soundtrack } from './soundtrack.js';

/**
 * Panama soundtrack. Caption text is the approved narration transcript, split into phrases. Times are seconds into
 * panama-narration.mp3 (29.73 s): each phrase starts at the first speech after a pause and ends at the next pause, as
 * found with ffmpeg silencedetect (-35 dB, 0.2 s) on the audio itself. The narration starts at the same 1.5 s as Noto's,
 * so it ends at 31.23 s and the musical swell has 3.8 s before the fade. Captions are held to the next phrase start
 * only inside a sentence.
 */
export const panamaSoundtrack: Soundtrack = {
  narrationFile: 'audio/panama-narration.mp3',
  musicFile: MUSIC[DEFAULT_MUSIC].file,
  narrationStart: 1.5,
  narrationDuration: 29.73,
  musicCredit: MUSIC[DEFAULT_MUSIC].credit,
  captions: [
    { text: 'On October ninth,', start: 0.05, end: 1.45 },
    { text: 'a powerful earthquake struck southern Panama,', start: 1.456, end: 4.46 },
    { text: 'shaking communities across the region.', start: 4.467, end: 6.69 },
    { text: 'Buildings, roads and bridges were damaged,', start: 7.25, end: 10.14 },
    { text: 'causing widespread disruption.', start: 10.149, end: 11.86 },
    { text: 'More than two hundred aftershocks followed,', start: 12.343, end: 14.91 },
    { text: 'including a magnitude six point six tremor.', start: 14.918, end: 17.77 },
    { text: 'Authorities declared a national emergency', start: 18.213, end: 20.87 },
    { text: 'as response teams mobilized.', start: 20.873, end: 22.59 },
    { text: 'The disaster is a stark reminder:', start: 23.01, end: 25.55 },
    { text: 'earthquakes can strike without warning,', start: 25.558, end: 27.98 },
    { text: 'and preparation matters.', start: 27.981, end: 29.73 }
  ]
};
