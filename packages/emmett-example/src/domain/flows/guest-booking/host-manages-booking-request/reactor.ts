import {
    type CommandSender,
    InMemoryEventStore,
    type InMemoryReadEventMetadata,
    type MessageHandlerResult,
    reactor,
} from '@event-driven-io/emmett';
import type { BookingRequested } from '../guest-submits-booking-request';
import { ReactorContext } from "../../../shared";

export const setup = async (eventStore: InMemoryEventStore, commandSender: CommandSender) => {
    const context: ReactorContext = {
        eventStore,
        commandSender,
    };

    const policyReactor = reactor<
        BookingRequested,
        InMemoryReadEventMetadata,
        ReactorContext
    >({
        processorId: 'email-confirmation-policy',
        canHandle: ['BookingRequested'],
        eachMessage: async (event, context): Promise<MessageHandlerResult> => {
            try {
                await context.commandSender.send({
                    type: 'NotifyHost',
                    kind: 'Command',
                    data: event.data,
                    metadata: {
                        now: new Date(),
                        correlationId: event.data.bookingId,
                    }
                });
                return;
            } catch (error) {
                return {
                    type: 'SKIP',
                    reason: `Failed with error: ${error}`,
                };
            }
        },
    });

    await policyReactor.start(context);
    console.log('Email confirmation policy reactor started');

    return {
        policyReactor,
    };
};