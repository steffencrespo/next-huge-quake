/**
 * Shared shell for the educational Shorts 02 to 04: bundled fonts, the episode's visuals, burned-in captions, the
 * Like/Subscribe card, the ducked music bed, narration clips and sound effects. Timing comes from the narration beats
 * (see episodes.ts), so scenes follow the voice. Without audio it renders a silent preview with timed placeholder captions.
 */
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { musicGain } from '../audio/soundtrack.js';
import { COLORS, TYPE } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Captions, Cta } from './ScienceShort.js';
import { EPISODES, beatsFor, episodeSeconds, placeholderCaptions } from './episodes.js';
import type { Beats, EpisodeId, EpisodeMeta } from './episodes.js';
import { eduAudioSchema } from './narration.js';
import type { EduAudio } from './narration.js';
import { EXTRA_SFX, SFX_FILES } from './sfx.js';

export const FPS = 30;

export type SfxName = 'rumble' | 'boom' | 'tick' | 'whoosh' | 'riser';
/** A sound effect: starts at `at` seconds, is cut after `dur` seconds, plays at `volume` (a fixed level or a function of seconds since start). */
export type SfxCue = { sfx: SfxName; at: number; dur: number; volume: number | ( ( s: number ) => number ) };
export const SFX_PATHS: Record<SfxName, string> = { rumble: SFX_FILES.rumble, boom: SFX_FILES.boom, tick: EXTRA_SFX.tick.file, whoosh: EXTRA_SFX.whoosh.file, riser: EXTRA_SFX.riser.file };

export type EpisodeVisuals = React.FC<{ t: number; b: Beats }>;
export type EpisodeDefinition = { id: EpisodeId | string; meta?: EpisodeMeta; Visuals: EpisodeVisuals; cues: ( b: Beats ) => SfxCue[] };

export const eduShortSchema = z.object( { audio: eduAudioSchema.optional() } );
export type EduShortProps = z.infer<typeof eduShortSchema>;

export const calculateEduMetadata = ( id: EpisodeId | EpisodeMeta ): CalculateMetadataFunction<EduShortProps> => ( { props } ) => ( {
  durationInFrames: episodeSeconds( typeof id === 'string' ? EPISODES[id as EpisodeId] : id, props.audio ) * FPS
} );

const Layers: React.FC<{ audio: EduAudio; cues: SfxCue[]; total: number }> = ( { audio, cues, total } ) => {
  const span = { narrationStart: audio.narrationStart, narrationDuration: audio.narrationEnd - audio.narrationStart };
  return (
    <>
      <Audio src={staticFile( audio.musicFile )} volume={f => musicGain( f / FPS, span, total )} />
      {audio.clips.map( clip => (
        <Sequence key={clip.id} from={Math.round( clip.start * FPS )} layout="none">
          <Audio src={staticFile( clip.file )} volume={clip.gain ?? 1} />
        </Sequence>
      ) )}
      {cues.map( ( cue, i ) => (
        <Sequence key={i} from={Math.round( cue.at * FPS )} durationInFrames={Math.round( cue.dur * FPS )} layout="none">
          <Audio src={staticFile( SFX_PATHS[cue.sfx] )} volume={typeof cue.volume === 'number' ? cue.volume : f => ( cue.volume as ( s: number ) => number )( f / FPS )} />
        </Sequence>
      ) )}
    </>
  );
};

export function makeEduShort( def: EpisodeDefinition ): React.FC<EduShortProps> {
  const meta = def.meta ?? EPISODES[def.id as EpisodeId];
  const Short: React.FC<EduShortProps> = ( { audio } ) => {
    useBundledFonts();
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const t = frame / FPS;
    const b = beatsFor( meta, audio );
    return (
      <AbsoluteFill style={{ background: COLORS.background }}>
        <def.Visuals t={t} b={b} />
        <Cta frame={frame} start={b.cta.start - 1} />
        <Captions t={t} captions={audio?.captions ?? placeholderCaptions( meta.script )} />
        {audio ? <Layers audio={audio} cues={def.cues( b )} total={durationInFrames / FPS} /> : null}
      </AbsoluteFill>
    );
  };
  return Short;
}

/** Small series label shown under the Shorts safe top margin. */
export const SeriesTag: React.FC<{ number: number; opacity?: number }> = ( { number, opacity = 1 } ) => (
  <div style={{ position: 'absolute', left: 72, top: 200, ...TYPE.kicker, fontSize: 32, color: COLORS.redText, opacity }}>EARTHQUAKE SCIENCE EXPLAINED · {String( number ).padStart( 2, '0' )}</div>
);
