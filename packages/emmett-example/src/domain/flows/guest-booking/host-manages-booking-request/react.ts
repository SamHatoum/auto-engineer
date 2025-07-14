import {
    type InMemoryReadEventMetadata,
    type MessageHandlerResult,
    reactor,
} from '@event-driven-io/emmett';
import type { BookingRequested } from '../guest-submits-booking-request/events';
import type { ReactorContext } from '../../../shared';

export const react = () =>
    reactor<BookingRequested, InMemoryReadEventMetadata, ReactorContext>({
        processorId: 'email-confirmation-policy',
        canHandle: ['BookingRequested'],
        eachMessage: async (event, context): Promise<MessageHandlerResult> => {
            if (event.data.status !== 'pending_host_approval') {
                return {
                    type: 'SKIP',
                    reason: `Booking status is ${event.data.status}, not pending_host_approval`,
                };
            }
            await context.commandSender.send({
                type: 'NotifyHost',
                kind: 'Command',
                data: {
                    hostId: event.data.hostId,
                    bookingId: event.data.bookingId,
                    notificationType: 'booking_request',
                    priority: 'high',
                    channels: ['push', 'email', 'sms'],
                    message: event.data.message,
                    actionRequired: true,
                },
                metadata: {
                    correlationId: event.data.bookingId,
                    now: new Date(),
                },
            });

            return;
        },
    });