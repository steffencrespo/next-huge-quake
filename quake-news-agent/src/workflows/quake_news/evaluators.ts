import { evaluator, EvaluationBooleanResult, z } from '@outputai/core';
import type { EvaluationResultArgs } from '@outputai/core';
import { generateText, aiSdk } from '@outputai/llm';
import { describeFacts } from './facts.js';
import { newsDraftSchema, quakeFactsSchema } from './types.js';

/** LLM-as-judge editorial review. Advisory only: it cannot override the deterministic fact check. */
export const reviewDraft = evaluator( {
  name: 'review_news_draft',
  description: 'Editorial review of the draft: English, neutral news tone, clarity, grounding, and speakable narration',
  inputSchema: z.object( {
    facts: quakeFactsSchema,
    draft: newsDraftSchema
  } ),
  fn: async ( { facts, draft } ) => {
    const { output } = await generateText( {
      prompt: 'draft_review@v1',
      variables: { ...describeFacts( facts ), ...draft },
      output: aiSdk.Output.object( { schema: EvaluationBooleanResult.schema } )
    } );

    return new EvaluationBooleanResult( output as EvaluationResultArgs<boolean> );
  }
} );
