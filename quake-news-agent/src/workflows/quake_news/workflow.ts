import { workflow } from '@outputai/core';
import { fetchEarthquake, factCheckDraft, writeDraft } from './steps.js';
import { reviewDraft } from './evaluators.js';
import { combineValidation, revisionFeedback } from './validation.js';
import { toVideoPackage } from './videoPackage.js';
import { workflowInputSchema, workflowOutputSchema } from './types.js';
import type { NewsDraft, Review, ValidationReport, WorkflowOutput } from './types.js';

export const MAX_DRAFT_ATTEMPTS = 2;

export default workflow( {
  name: 'quake_news',
  description: 'Fetch a USGS earthquake and produce a validated English news article plus a short narration script',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
  fn: async ( input ): Promise<WorkflowOutput> => {
    const lookup = await fetchEarthquake( input );
    if ( lookup.status === 'no_candidate' ) {
      return { status: 'no_candidate', criteria: lookup.criteria, reason: lookup.reason };
    }

    const { facts } = lookup;
    const attempts: Array<{ attempt: number; passed: boolean; factCheckPassed: boolean; reviewPassed: boolean }> = [];
    let feedback: string[] = [];
    let draft: NewsDraft | undefined;
    let validation: ValidationReport | undefined;

    for ( let attempt = 1; attempt <= MAX_DRAFT_ATTEMPTS; attempt++ ) {
      draft = await writeDraft( { facts, feedback } );
      const factCheck = await factCheckDraft( { facts, draft } );
      const evaluation = await reviewDraft( { facts, draft } );
      const review: Review = {
        passed: evaluation.value === true,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning ?? null,
        feedback: ( evaluation.feedback ?? [] ).map( f => f.suggestion ? `${f.issue} (${f.suggestion})` : f.issue )
      };
      validation = combineValidation( factCheck, review );
      attempts.push( { attempt, passed: validation.passed, factCheckPassed: factCheck.passed, reviewPassed: review.passed } );
      if ( validation.passed ) {
        break;
      }
      feedback = revisionFeedback( validation );
    }

    const output: WorkflowOutput = { status: 'draft', facts, draft: draft!, validation: validation!, attempts };
    return input.asOfUtc ? { ...output, videoPackage: toVideoPackage( output, { asOfUtc: input.asOfUtc } ) } : output;
  },
  options: {
    activityOptions: {
      retry: {
        maximumAttempts: 3
      }
    }
  }
} );
