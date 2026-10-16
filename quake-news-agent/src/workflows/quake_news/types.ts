import { z } from '@outputai/core';

export const DEFAULT_MIN_MAGNITUDE = 5.5;
export const DEFAULT_DAYS = 7;

export const workflowInputSchema = z.object( {
  eventId: z.string().min( 1 ).optional()
    .describe( 'USGS event ID (e.g. us6000m0xl). When set, minMagnitude and days are ignored.' ),
  minMagnitude: z.number().min( 0 ).max( 10 ).default( DEFAULT_MIN_MAGNITUDE )
    .describe( 'Minimum magnitude when selecting the strongest recent earthquake' ),
  days: z.number().int().min( 1 ).max( 30 ).default( DEFAULT_DAYS )
    .describe( 'Look-back window in days when selecting the strongest recent earthquake' )
} );

export const quakeFactsSchema = z.object( {
  id: z.string(),
  magnitude: z.number(),
  magType: z.string().nullable(),
  place: z.string(),
  timeUtc: z.string().describe( 'Origin time, ISO 8601 UTC' ),
  updatedUtc: z.string().nullable().describe( 'Last USGS update, ISO 8601 UTC' ),
  status: z.enum( [ 'reviewed', 'automatic', 'deleted', 'unknown' ] ),
  latitude: z.number(),
  longitude: z.number(),
  depthKm: z.number().nullable(),
  tsunamiFlag: z.boolean().nullable().describe( 'USGS tsunami flag: tsunami info is linked, not proof a tsunami occurred' ),
  pagerAlert: z.enum( [ 'green', 'yellow', 'orange', 'red' ] ).nullable(),
  feltReports: z.number().int().nullable(),
  url: z.string()
} );

export const searchCriteriaSchema = z.object( {
  eventId: z.string().nullable(),
  minMagnitude: z.number().nullable(),
  startTimeUtc: z.string().nullable(),
  endTimeUtc: z.string().nullable()
} );

export const lookupResultSchema = z.discriminatedUnion( 'status', [
  z.object( { status: z.literal( 'found' ), criteria: searchCriteriaSchema, facts: quakeFactsSchema } ),
  z.object( { status: z.literal( 'no_candidate' ), criteria: searchCriteriaSchema, reason: z.string() } )
] );

export const newsDraftSchema = z.object( {
  headline: z.string().describe( 'News headline, at most 100 characters' ),
  dek: z.string().describe( 'One-sentence summary under the headline' ),
  article: z.string().describe( 'English news article of 100-150 words; paragraphs separated by blank lines' ),
  narration: z.string().describe( 'Spoken narration script for a 15-30 second video, 40-80 words' )
} );

export const factCheckReportSchema = z.object( {
  passed: z.boolean(),
  contradictions: z.array( z.string() ),
  unsupportedClaims: z.array( z.string() ),
  missing: z.array( z.string() ),
  shapeIssues: z.array( z.string() ),
  wordCounts: z.object( { article: z.number(), narration: z.number() } )
} );

export const reviewSchema = z.object( {
  passed: z.boolean(),
  confidence: z.number(),
  reasoning: z.string().nullable(),
  feedback: z.array( z.string() )
} );

export const validationReportSchema = z.object( {
  passed: z.boolean().describe( 'True only if the deterministic fact check AND the LLM review pass' ),
  factCheck: factCheckReportSchema,
  review: reviewSchema
} );

export const attemptSchema = z.object( {
  attempt: z.number(),
  passed: z.boolean(),
  factCheckPassed: z.boolean(),
  reviewPassed: z.boolean()
} );

export const workflowOutputSchema = z.discriminatedUnion( 'status', [
  z.object( {
    status: z.literal( 'draft' ),
    facts: quakeFactsSchema,
    draft: newsDraftSchema,
    validation: validationReportSchema,
    attempts: z.array( attemptSchema )
  } ),
  z.object( {
    status: z.literal( 'no_candidate' ),
    criteria: searchCriteriaSchema,
    reason: z.string()
  } )
] );

export type WorkflowInput = z.infer<typeof workflowInputSchema>;
export type QuakeFacts = z.infer<typeof quakeFactsSchema>;
export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;
export type LookupResult = z.infer<typeof lookupResultSchema>;
export type NewsDraft = z.infer<typeof newsDraftSchema>;
export type FactCheckReport = z.infer<typeof factCheckReportSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;
