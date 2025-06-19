import type { WorkflowState } from './state';
import type { HostNotified } from './events';

export const evolve = (
    state: WorkflowState,
    event: HostNotified,
): WorkflowState => {
    switch (event.type) {
        case 'HostNotified': {
            if (state.status !== 'Initial') return state;

            return {
                status: 'Completed',
                hostId: event.data.hostId,
                notifiedAt: event.data.notifiedAt,
            };
        }
        default: {
            return state;
        }
    }
};