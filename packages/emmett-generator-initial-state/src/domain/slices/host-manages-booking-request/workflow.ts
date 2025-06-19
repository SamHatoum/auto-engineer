import type { Workflow} from '@event-driven-io/emmett';
import type { BookingRequested } from '../guest-submits-booking-request/events';
import type { NotifyHost } from './commands';
import type { WorkflowState } from './state';
import { initialWorkflowState } from './state';
import {decide} from "./decide";


export type HostNotificationInput = BookingRequested;
export type HostNotificationOutput = NotifyHost;


export enum IgnoredReason {
    AlreadyProcessed = 'AlreadyProcessed',
}

export const HostManagesBookingRequestWorkflow: Workflow<
    HostNotificationInput,
    WorkflowState,
    HostNotificationOutput
> = {
    decide,
    evolve: (state, workflowEvent) => {
        return state;
    },
    initialState: initialWorkflowState,
};