import type { Row } from './ContactSheet.js';

/** Grouped for comparison: openings and facts, context cards, then live map, preliminary data and closings. */
export const ROWS: Row[] = [
  { title: 'Hook and facts', tiles: [
    { file: '01-hook-noto.png', label: '01 · Hook · Noto (frame 0)' },
    { file: '08-hook-kamchatka.png', label: '08 · Hook · Kamchatka (frame 0)' },
    { file: '02-facts-noto.png', label: '02 · Facts · Noto (static backdrop)' },
    { file: '03-facts-live-noto.png', label: '03 · Facts · Noto (live map)' }
  ] },
  { title: 'Context cards', tiles: [
    { file: '04-context-depth-noto.png', label: '04 · Context 1/3 · Depth · Noto' },
    { file: '05-context-pager-noto.png', label: '05 · Context 2/3 · PAGER · Noto' },
    { file: '06-context-felt-noto.png', label: '06 · Context 3/3 · Felt reports · Noto' },
    { file: '11-context-preliminary-test.png', label: '11 · Context · Review status · Test' }
  ] },
  { title: 'Live map, preliminary test data and closing', tiles: [
    { file: '09-facts-live-kamchatka.png', label: '09 · Facts · Kamchatka (live map)' },
    { file: '10-facts-preliminary-test.png', label: '10 · Facts · Preliminary test data' },
    { file: '07-closing-noto.png', label: '07 · Closing · Noto' },
    { file: '12-closing-preliminary-test.png', label: '12 · Closing · Preliminary test data' }
  ] }
];
