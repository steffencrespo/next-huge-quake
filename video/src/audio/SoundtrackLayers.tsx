import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../design/tokens.js';
import { captionAt, musicGain } from './soundtrack.js';
import type { Soundtrack } from './soundtrack.js';

/** Burned-in caption: white text with a dark outline on a translucent pill, below the source footer (y 1462-1500). */
const CAPTION_BOX = { left: 72, width: 858, top: 1524, height: 150 } as const;

export const Captions: React.FC<{ soundtrack: Soundtrack }> = ( { soundtrack } ) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const caption = captionAt( frame / fps, soundtrack );
  if ( caption === null ) {
    return null;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', ...CAPTION_BOX, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: FONT.ui,
            fontWeight: 700,
            fontSize: 46,
            lineHeight: 1.2,
            textAlign: 'center',
            color: COLORS.text,
            background: 'rgba(7, 11, 20, 0.78)',
            padding: '12px 24px',
            borderRadius: 12,
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)'
          }}
        >
          {caption.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Music (ducked under the narration) and narration audio tracks. */
export const SoundtrackAudio: React.FC<{ soundtrack: Soundtrack }> = ( { soundtrack } ) => {
  const { fps, durationInFrames } = useVideoConfig();
  const duration = durationInFrames / fps;
  return (
    <>
      <Audio src={staticFile( soundtrack.musicFile )} volume={frame => musicGain( frame / fps, soundtrack, duration )} />
      <Sequence from={Math.round( soundtrack.narrationStart * fps )} layout="none">
        <Audio src={staticFile( soundtrack.narrationFile )} />
      </Sequence>
    </>
  );
};
