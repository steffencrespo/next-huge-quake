/**
 * Asset manifest. The AI stills are generated manually by the owner in the ElevenLabs web UI (prompts in PROMPTS.md; no image API calls)
 * and saved under assets/ai/ with these names. render.ts stages every file that exists into public/ and tells the composition which ones
 * are present; a missing still renders as a labelled placeholder, never as a substitute image. AI-5 is optional: without it, the ending
 * reuses AI-1 with its own move.
 */
export type Asset = { id: string; file: string; staged: string; scene: string; optional?: boolean };

const DIR = 'exp-oil-drilling-cinematic';

export const ASSETS = {
  ai1: { id: 'AI-1', file: 'ai/ai-1-oil-field-hero.png', staged: `${DIR}/ai-1.png`, scene: 'hook: oil field hero' },
  ai2: { id: 'AI-2', file: 'ai/ai-2-wastewater-injection.png', staged: `${DIR}/ai-2.png`, scene: 'wastewater injection cutaway' },
  ai3: { id: 'AI-3', file: 'ai/ai-3-fault-pressure.png', staged: `${DIR}/ai-3.png`, scene: 'pressure on a pre-existing fault' },
  ai4: { id: 'AI-4', file: 'ai/ai-4-pawnee-earthquake.png', staged: `${DIR}/ai-4.png`, scene: 'generic Great Plains landscape' },
  ai5: { id: 'AI-5', file: 'ai/ai-5-closing.png', staged: `${DIR}/ai-5.png`, scene: 'closing: oil field over rock', optional: true }
} as const satisfies Record<string, Asset>;

export type AssetKey = keyof typeof ASSETS;
