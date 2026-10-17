/**
 * Layout grid and regions for the 1080x1920 vertical frame.
 *
 * The safe area keeps text clear of platform UI on vertical video apps: the top bar, the caption and
 * button area at the bottom, and the action-button rail on the right. layout.spec.ts checks that every
 * text region lies inside it and that regions shown together do not overlap.
 */
export const CANVAS = { width: 1080, height: 1920 } as const;
export const SAFE = { top: 200, bottom: 420, left: 72, right: 150 } as const;

export type Rect = { x: number; y: number; width: number; height: number };

export const CONTENT: Rect = { x: SAFE.left, y: SAFE.top, width: CANVAS.width - SAFE.left - SAFE.right, height: CANVAS.height - SAFE.top - SAFE.bottom };

const band = ( y: number, height: number ): Rect => ( { x: CONTENT.x, y, width: CONTENT.width, height } );

export const GUTTER = 16;

/** Text regions. */
export const REGIONS = {
  /** Tag row, archive date, update timestamp, preliminary badge. */
  chrome: band( 200, 230 ),
  /** Opening magnitude, place and date (hook, before it compacts). */
  hook: band( 600, 720 ),
  /** Place name strip in the facts scene. */
  lowerThird: band( 912, 186 ),
  /** Data panel rows in the facts scene. */
  dataGrid: band( 1112, 340 ),
  /** One context card at a time. */
  contextCard: band( 880, 570 ),
  /** Closing card. */
  closing: band( 470, 960 ),
  /** Source attribution, bottom of the safe area. */
  footer: band( 1462, 38 )
} satisfies Record<string, Rect>;

/** Reserved for the map (no text): between the chrome and the lower third. Overlays may extend past it. */
export const MAP_ZONE: Rect = { x: 0, y: 430, width: CANVAS.width, height: 470 };

/** Which text regions appear together, by layout. */
export const LAYOUTS = {
  hook: [ 'chrome', 'hook', 'footer' ],
  facts: [ 'chrome', 'lowerThird', 'dataGrid', 'footer' ],
  context: [ 'chrome', 'contextCard', 'footer' ],
  // The closing card carries the full source block, so the footer is not repeated.
  closing: [ 'chrome', 'closing' ]
} satisfies Record<string, ( keyof typeof REGIONS )[]>;

export const inside = ( inner: Rect, outer: Rect ) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

export const overlaps = ( a: Rect, b: Rect ) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export const rectStyle = ( r: Rect ) => ( { position: 'absolute' as const, left: r.x, top: r.y, width: r.width, height: r.height } );
