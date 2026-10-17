import { useState } from 'react';
import { loadFonts } from './fonts.js';

/** Holds the first frame until the bundled fonts are loaded. */
export function useBundledFonts(): void {
  useState( () => loadFonts() );
}
