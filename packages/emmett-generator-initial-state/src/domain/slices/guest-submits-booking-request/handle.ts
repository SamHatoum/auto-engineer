import { CommandHandler, type EventStore } from "@event-driven-io/emmett";
import { evolve } from "./evolve";
import { initialBookingState } from "./state";
import { decide } from "./decide";
import type { RequestBooking } from "./commands";

const commandHandler = CommandHandler({
    evolve,
    initialState: initialBookingState
});

export const handle = async (
    eventStore: EventStore,
    command: RequestBooking
): Promise<void> => {
    const streamId = `booking-${command.metadata.bookingId}`;
    await commandHandler(eventStore, streamId, (state) => {
        return decide(command, state);
    });
};