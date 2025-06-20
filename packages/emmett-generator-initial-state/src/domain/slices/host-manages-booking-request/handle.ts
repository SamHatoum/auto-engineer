import { CommandHandler } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { decide } from './decide';
import { initialNotificationState } from './state';
import type { BookingRequested } from '../guest-submits-booking-request';
import type { EventStore } from '@event-driven-io/emmett';

const commandHandler = CommandHandler({
    evolve,
    initialState: initialNotificationState,
});

export const handle = async (
    eventStore: EventStore,
    event: BookingRequested
): Promise<void> => {
    const streamId = `host-notification-${event.data.bookingId}`;
    await commandHandler(eventStore, streamId, (state) => {
        return decide(event, state);
    });
};