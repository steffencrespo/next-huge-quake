/** Narration for "SIX SEVEN: Earthquake Edition" v2. `gap` is the pause the storyboard wants after the line (seconds). */
export const SIX_SEVEN_SCRIPT = [
  { id: 'hook', text: 'Six seven!', gap: 0.55 },
  { id: 'magnitude', text: 'Okay, but magnitude six point seven? That’s no joke.', gap: 0.5 },
  { id: 'real', text: 'In 1994, a real one hit Northridge, California.', gap: 0.3 },
  { id: 'fault', text: 'A hidden fault ruptured deep underground.', gap: 0.35 },
  { id: 'rise', text: 'The Santa Susana Mountains rose by up to seventy centimeters.', gap: 0.6 },
  { id: 'said', text: 'Six seven? The mountains said…', gap: 0.95 },
  { id: 'seventy', text: 'Seventy!', gap: 0 }
] as const;

/** Approved text-to-speech budget in characters (about 270 ElevenLabs credits were authorized for the seven lines). */
export const SIX_SEVEN_BUDGET = 270;
