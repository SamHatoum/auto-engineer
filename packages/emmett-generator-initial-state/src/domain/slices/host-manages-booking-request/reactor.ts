import {
    reactor,
    type EventStore,
    type CommandSender,
    type SingleRecordedMessageHandlerWithContext,
    type InMemoryReadEventMetadata,
    type MessageHandlerResult
} from '@event-driven-io/emmett';
import type { BookingRequested } from '../guest-submits-booking-request/events';
import { HostNotificationHandler } from './handler';
import { handleNotifyHost } from './external-system';
import type { NotifyHost } from './commands';

type ReactorContext = {
    eventStore: EventStore;
    commandSender: CommandSender;
};

const handleBookingRequestedEvent: SingleRecordedMessageHandlerWithContext<
    BookingRequested,
    InMemoryReadEventMetadata,
    ReactorContext
> = async (recordedEvent, context): Promise<MessageHandlerResult> => {
    const { eventStore } = context;
    const event = recordedEvent as any;

    try {
        const notifyCommand: NotifyHost = {
            type: 'NotifyHost',
            kind: 'Command',
            data: {
                hostId: event.data.hostId,
                notificationType: 'booking_request',
                priority: 'high',
                channels: ['email', 'push', 'sms'],
                message: `Guest ${event.data.guestId} wants to book property ${event.data.propertyId} from ${event.data.checkIn} to ${event.data.checkOut}`,
                actionRequired: true,
            },
            metadata: {
                now: new Date(),
            },
        };
        await handleNotifyHost(notifyCommand);
        console.log(`📧 Host ${event.data.hostId} notified about booking ${event.data.bookingId}`);
        const handler = new HostNotificationHandler(eventStore);
        await handler.handle(event);
        console.log(`✅ Host notification completed for booking ${event.data.bookingId}`);
        return;
    } catch (error) {
        console.error(`❌ Host notification failed for booking ${event.data.bookingId}:`, error);

        return {
            type: 'STOP',
            reason: `Host notification failed: ${error}`,
        };
    }
};

export const setup = async (eventStore: EventStore, commandSender: CommandSender) => {
    const context: ReactorContext = {
        eventStore,
        commandSender,
    };
    const notificationReactor = reactor<
        BookingRequested,
        InMemoryReadEventMetadata,
        ReactorContext
    >({
        processorId: 'host-notification-policy',
        canHandle: ['BookingRequested'],
        eachMessage: handleBookingRequestedEvent,
    });
    await notificationReactor.start(context);
    console.log('Host notification policy reactor started');
    return {
        notificationReactor,
    };
};