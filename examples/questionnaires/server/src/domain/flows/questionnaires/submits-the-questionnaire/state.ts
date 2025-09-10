/**
 * ## IMPLEMENTATION INSTRUCTIONS ##
 *
 * Define the shape of the domain state for the current slice below. This state is used by `decide.ts`
 * to determine whether a command is valid.
 *
 * The state is evolved over time by applying domain events (in `evolve.ts`).
 * Each event updates the state incrementally based on business rules.
 *
 * Guidelines:
 * - Include only fields that are **read** during command validation.
 * - Use discriminated unions (e.g., `status: 'Pending' | 'Done'`) to model state transitions.
 * - Prefer primitive types: `string`, `boolean`, `number`.
 * - Use objects or maps only when structure is essential for decision logic.
 *
 * Do NOT include:
 * - Redundant data already emitted in events unless required to enforce business rules.
 * - Fields used only for projections, UI, or query purposes.
 *
 * ### Example (for a Task domain):
 *
 * ```ts
 * export type PendingTask = {
 *   status: 'Pending';
 * };
 *
 * export type InProgressTask = {
 *   status: 'InProgress';
 *   startedAt: string;
 * };
 *
 * export type CompletedTask = {
 *   status: 'Completed';
 *   completedAt: string;
 * };
 *
 * export type State = PendingTask | InProgressTask | CompletedTask;
 * ```
 */

// TODO: Replace with a discriminated union of domain states for the current slice
export type State = {};

// TODO: Replace the Return with the initial domain state of the current slice
export const initialState = (): State => {
  return {};
};
