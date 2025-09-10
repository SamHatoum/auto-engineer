import { IllegalStateError } from '@event-driven-io/emmett';
import type { State } from './state';
import type { AnswerQuestion } from './commands';
import type { QuestionnaireSubmitted } from './events';

export const decide = (command: AnswerQuestion, state: State): QuestionnaireSubmitted => {
  switch (command.type) {
    case 'AnswerQuestion': {
      /**
       * ## IMPLEMENTATION INSTRUCTIONS ##
       *
       * This command requires evaluating prior state to determine if it can proceed.
       *
       * You should:
       * - Validate the command input fields
       * - Inspect the current domain `state` to determine if the command is allowed
       * - If invalid, throw one of the following domain errors: `NotFoundError`, `ValidationError`, or `IllegalStateError`
       * - If valid, return one or more events with the correct structure
       *
       * ⚠️ Only read from inputs — never mutate them. `evolve.ts` handles state updates.
       */

      // return {
      //   type: 'QuestionnaireSubmitted',
      //   data: { ...command.data },
      // } as QuestionnaireSubmitted;

      throw new IllegalStateError('Not yet implemented: ' + command.type);
    }
    default:
      throw new IllegalStateError('Unexpected command type: ' + command.type);
  }
};
