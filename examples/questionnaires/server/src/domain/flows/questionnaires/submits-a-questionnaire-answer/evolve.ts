import type { State } from './state';
import type { QuestionAnswered } from './events';
import type { QuestionnaireLinkSent } from './events';
import type { QuestionnaireEditRejected } from './events';

/**
 * ## IMPLEMENTATION INSTRUCTIONS ##
 *
 * This function defines how the domain state evolves in response to events.
 *
 * Guidelines:
 * - Apply only the **minimal** necessary changes for future decisions in `decide.ts`.
 * - Ignore any event fields not required for decision-making logic.
 * - If the event doesn’t change decision-relevant state, return the existing `state`.
 * - Prefer immutability: always return a **new state object**.
 * - Avoid spreading all of `event.data` unless all fields are relevant.
 */

export const evolve = (
  state: State,
  event: QuestionAnswered | QuestionnaireLinkSent | QuestionnaireEditRejected,
): State => {
  switch (event.type) {
    case 'QuestionAnswered': {
      // TODO: Update state based on QuestionAnswered
      return {
        ...state,
      };
    }
    case 'QuestionnaireLinkSent': {
      // TODO: Update state based on QuestionnaireLinkSent
      return {
        ...state,
      };
    }
    case 'QuestionnaireEditRejected': {
      // TODO: Update state based on QuestionnaireEditRejected
      return {
        ...state,
      };
    }
    default:
      return state;
  }
};
