import { CommandHandler, type EventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { decide } from './decide';
import { initialNotificationState } from './state';
import type { BookingRequested } from '../guest-submits-booking-request/events';

export class HostNotificationHandler {
    private commandHandler = CommandHandler({
        evolve,
        initialState: initialNotificationState,
    });

    constructor(private eventStore: EventStore) {}
    async handle(event: BookingRequested): Promise<void> {
        const streamId = `host-notification-${event.data.bookingId}`;
        await this.commandHandler(this.eventStore, streamId, (state) => {
            return decide(event, state);
        });
    }
}