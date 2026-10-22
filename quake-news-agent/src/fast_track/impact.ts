/**
 * USGS PAGER detail for the fast track: the separate fatality and economic alert levels and the population exposed to
 * strong shaking. These are model estimates. Nothing here is a confirmed casualty or damage figure, and nothing in the
 * fast track ever reports one.
 */
export type PagerLevel = 'green' | 'yellow' | 'orange' | 'red';

export type PagerImpact = {
  fatalityLevel: PagerLevel | null;
  economicLevel: PagerLevel | null;
  /** Modeled population at shaking intensity VI or higher (PAGER exposure). */
  exposedMmi6Plus: number | null;
  /** Max intensity estimated anywhere (ShakeMap through PAGER). */
  maxMmi: number | null;
};

/** What the PAGER product of an event detail links to, or null when USGS has no PAGER product yet. */
export function pagerUrls( detail: unknown ): { alerts: string | null; exposures: string | null; maxMmi: number | null } | null {
  const products = ( detail as { properties?: { products?: Record<string, unknown[]> } } )?.properties?.products;
  const pager = products?.losspager?.[0] as { contents?: Record<string, { url?: string }>; properties?: Record<string, string> } | undefined;
  if ( !pager ) {
    return null;
  }
  const maxMmi = Number( pager.properties?.maxmmi );
  return {
    alerts: pager.contents?.['json/alerts.json']?.url ?? null,
    exposures: pager.contents?.['json/exposures.json']?.url ?? null,
    maxMmi: Number.isFinite( maxMmi ) ? maxMmi : null
  };
}

const LEVELS: readonly PagerLevel[] = [ 'green', 'yellow', 'orange', 'red' ];
const level = ( value: unknown ): PagerLevel | null => LEVELS.find( l => l === value ) ?? null;

/** Combines alerts.json and exposures.json (either may be null when USGS did not publish it). */
export function parsePagerImpact( alerts: unknown, exposures: unknown, maxMmi: number | null ): PagerImpact {
  const a = alerts as { fatality?: { level?: unknown }; economic?: { level?: unknown } } | null;
  const e = exposures as { population_exposure?: { mmi?: unknown[]; aggregated_exposure?: unknown[] } } | null;
  let exposedMmi6Plus: number | null = null;
  const mmi = e?.population_exposure?.mmi;
  const people = e?.population_exposure?.aggregated_exposure;
  if ( Array.isArray( mmi ) && Array.isArray( people ) && mmi.length === people.length ) {
    exposedMmi6Plus = mmi.reduce<number>( ( sum, value, i ) =>
      Number( value ) >= 6 && Number.isFinite( Number( people[i] ) ) ? sum + Number( people[i] ) : sum, 0 );
  }
  return { fatalityLevel: level( a?.fatality?.level ), economicLevel: level( a?.economic?.level ), exposedMmi6Plus, maxMmi };
}
