import type { HostNotified } from './events';
import type { NotificationState } from './state';
import {NotifyHost} from "./commands";

export const decide = (
    command: NotifyHost,
    state: NotificationState
): HostNotified => {
    if (state.status !== 'Initial') {
        throw new Error('Host already notified for this booking');
    }
    return {
        type: 'HostNotified',
        data: {
            bookingId: command.data.bookingId,
            hostId: command.data.hostId,
            notificationType: 'booking_request',
            channels: ['email', 'push', 'sms'],
            notifiedAt: new Date(),
        },
    };
};