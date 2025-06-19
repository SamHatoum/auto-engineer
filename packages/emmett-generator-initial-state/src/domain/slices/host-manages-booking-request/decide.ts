import {HostNotificationInput, HostNotificationOutput, IgnoredReason} from "./workflow";
import {WorkflowState} from "./state";
import {complete, ignore, send, WorkflowOutput} from "@event-driven-io/emmett";
import {NotifyHost} from "./commands";

export const decide = (
    input: HostNotificationInput,
    state: WorkflowState,
): WorkflowOutput<HostNotificationOutput>[] => {
    const { type, data } = input;

    switch (type) {
        case 'BookingRequested': {
            if (state.status !== 'Initial') {
                return [ignore(IgnoredReason.AlreadyProcessed)];
            }

            const notifyCommand: NotifyHost = {
                type: 'NotifyHost',
                kind: 'Command',
                data: {
                    hostId: 'host_321',
                    notificationType: 'booking_request',
                    priority: 'high',
                    channels: ['email', 'push', 'sms'],
                    message: `Guest ${data.guestId} wants to book property ${data.propertyId}`,
                    actionRequired: true,
                },
                metadata: {
                    now: new Date(),
                },
            };

            return [
                send<HostNotificationOutput>(notifyCommand),
                complete(),
            ];
        }
        default: {
            const _notExistingEventType: never = type;
            return [ignore('UnknownInputType')];
        }
    }
};