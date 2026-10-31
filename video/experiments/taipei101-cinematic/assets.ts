/**
 * Asset manifest. The AI stills are generated manually by the owner in the ElevenLabs web UI (prompts in PROMPTS.md; no image API calls)
 * and saved under assets/ai/ with these names. render.ts stages every file that exists into public/ and tells the composition which ones
 * are present; a missing still renders as a labelled placeholder, never as a substitute image. AI-2 is optional: without it, the 'rose'
 * beat reuses AI-1 with its own move.
 */
export type Asset = { id: string; file: string; staged: string; scene: string; optional?: boolean };

const DIR = 'exp-taipei101-cinematic';

export const ASSETS = {
  ai1: { id: 'AI-1', file: 'ai/ai-1-hero-low-angle.png', staged: `${DIR}/ai-1.png`, scene: 'hook: low-angle hero' },
  ai2: { id: 'AI-2', file: 'ai/ai-2-scale-basin.png', staged: `${DIR}/ai-2.png`, scene: 'the tower rose: scale over the basin', optional: true },
  ai3: { id: 'AI-3', file: 'ai/ai-3-cutaway.png', staged: `${DIR}/ai-3.png`, scene: 'two earthquakes: cutaway below the tower' },
  ai4: { id: 'AI-4', file: 'ai/ai-4-fault.png', staged: `${DIR}/ai-4.png`, scene: 'hidden fault: deep crust' },
  ai5: { id: 'AI-5', file: 'ai/ai-5-night-hero.png', staged: `${DIR}/ai-5.png`, scene: 'twist and ending: night hero' }
} as const satisfies Record<string, Asset>;

export type AssetKey = keyof typeof ASSETS;
