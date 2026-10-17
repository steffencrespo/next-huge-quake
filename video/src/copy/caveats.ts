/**
 * Fixed caveat sentences. They name what the data does NOT establish, so they contain words the guard bans in
 * assertions ("casualties", "tsunami occurred"). The guard exempts exactly these strings, nothing looser.
 */
export const PAGER_CAVEAT = 'Based on modeled potential impacts, not confirmed damage or casualties.';
export const TSUNAMI_CAVEAT = 'Does not confirm a tsunami or an active warning.';

export const CAVEATS: readonly string[] = [ PAGER_CAVEAT, TSUNAMI_CAVEAT ];
