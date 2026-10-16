import { step, z } from '@outputai/core';
import { generateText, aiSdk } from '@outputai/llm';
import { queryUsgs } from '../../clients/usgs.js';
import { describeFacts } from './facts.js';
import { normalizeUsgsResponse } from './normalize.js';
import { checkDraft } from './validation.js';
import {
  factCheckReportSchema,
  lookupResultSchema,
  newsDraftSchema,
  quakeFactsSchema,
  workflowInputSchema
} from './types.js';
import type { LookupResult, SearchCriteria } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const fetchEarthquake = step( {
  name: 'fetch_earthquake',
  description: 'Fetch one earthquake from the USGS catalog by event ID, or the strongest recent one above a magnitude threshold',
  inputSchema: workflowInputSchema,
  outputSchema: lookupResultSchema,
  fn: async ( { eventId, minMagnitude, days } ): Promise<LookupResult> => {
    if ( eventId ) {
      const criteria: SearchCriteria = { eventId, minMagnitude: null, startTimeUtc: null, endTimeUtc: null };
      const response = await queryUsgs( { eventId } );
      const facts = response.found ? normalizeUsgsResponse( response.body ) : null;
      return facts ?
        { status: 'found', criteria, facts } :
        { status: 'no_candidate', criteria, reason: `USGS has no event with ID "${eventId}"` };
    }

    const now = Date.now();
    const criteria: SearchCriteria = {
      eventId: null,
      minMagnitude,
      startTimeUtc: new Date( now - days * DAY_MS ).toISOString(),
      endTimeUtc: new Date( now ).toISOString()
    };
    const response = await queryUsgs( {
      startTimeUtc: criteria.startTimeUtc!,
      endTimeUtc: criteria.endTimeUtc!,
      minMagnitude
    } );
    const facts = response.found ? normalizeUsgsResponse( response.body ) : null;
    return facts ?
      { status: 'found', criteria, facts } :
      { status: 'no_candidate', criteria, reason: `No earthquake of magnitude ${minMagnitude} or greater in the last ${days} day(s)` };
  }
} );

export const writeDraft = step( {
  name: 'write_news_draft',
  description: 'Write an English news article and a short video narration script grounded in USGS facts',
  inputSchema: z.object( {
    facts: quakeFactsSchema,
    feedback: z.array( z.string() )
  } ),
  outputSchema: newsDraftSchema,
  fn: async ( { facts, feedback } ) => {
    const { output } = await generateText( {
      prompt: 'news_draft@v1',
      variables: { ...describeFacts( facts ), feedback },
      output: aiSdk.Output.object( { schema: newsDraftSchema } )
    } );
    return output;
  }
} );

export const factCheckDraft = step( {
  name: 'fact_check_draft',
  description: 'Deterministically check the draft against the USGS facts',
  inputSchema: z.object( {
    facts: quakeFactsSchema,
    draft: newsDraftSchema
  } ),
  outputSchema: factCheckReportSchema,
  fn: async ( { facts, draft } ) => checkDraft( facts, draft )
} );
