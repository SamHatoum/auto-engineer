import type { BookingRequested } from '../guest-submits-booking-request';
import type { HostNotified } from './events';
import type { NotificationState } from './state';

export const decide = (
    event: BookingRequested,
    state: NotificationState
): HostNotified => {
    if (state.status !== 'Initial') {
        throw new Error('Host already notified for this booking');
    }

    return {
        type: 'HostNotified',
        data: {
            bookingId: event.data.bookingId,
            hostId: event.data.hostId,
            notificationType: 'booking_request',
            channels: ['email', 'push', 'sms'],
            notifiedAt: new Date(),
        },
    };
};