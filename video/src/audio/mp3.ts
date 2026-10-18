/**
 * Exact duration of an MP3 file, from its frame headers (MPEG-1/2 Layer III, which ElevenLabs returns).
 * Walks every frame, so it is correct for constant and variable bitrate; no ffprobe needed.
 */
const BITRATES_V1 = [ 0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320 ];
const BITRATES_V2 = [ 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160 ];
const SAMPLE_RATES: Record<number, number[]> = { 3: [ 44100, 48000, 32000 ], 2: [ 22050, 24000, 16000 ], 0: [ 11025, 12000, 8000 ] };

export function mp3DurationSeconds( data: Uint8Array ): number {
  let pos = 0;
  if ( data.length >= 10 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33 ) {
    pos = 10 + ( ( data[6] & 0x7f ) << 21 | ( data[7] & 0x7f ) << 14 | ( data[8] & 0x7f ) << 7 | ( data[9] & 0x7f ) );
  }
  let seconds = 0;
  let frames = 0;
  while ( pos + 4 <= data.length ) {
    if ( data[pos] !== 0xff || ( data[pos + 1] & 0xe0 ) !== 0xe0 ) {
      pos++;
      continue;
    }
    const version = ( data[pos + 1] >> 3 ) & 3;
    const layer = ( data[pos + 1] >> 1 ) & 3;
    const bitrateIndex = data[pos + 2] >> 4;
    const rateIndex = ( data[pos + 2] >> 2 ) & 3;
    if ( version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3 ) {
      pos++;
      continue;
    }
    const mpeg1 = version === 3;
    const bitrate = ( mpeg1 ? BITRATES_V1 : BITRATES_V2 )[bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES[version][rateIndex];
    const samples = mpeg1 ? 1152 : 576;
    const length = Math.floor( ( samples / 8 ) * bitrate / sampleRate ) + ( ( data[pos + 2] >> 1 ) & 1 );
    seconds += samples / sampleRate;
    frames++;
    pos += length;
  }
  if ( frames === 0 ) {
    throw new Error( 'could not read audio duration: no MP3 frames found' );
  }
  return seconds;
}
