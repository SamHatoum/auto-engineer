import {
    type CommandSender,
    InMemoryEventStore,
    type InMemoryReadEventMetadata,
    type MessageHandlerResult,
    reactor,
    type SingleRecordedMessageHandlerWithContext
} from '@event-driven-io/emmett';
import type {BookingRequested} from '../guest-submits-booking-request';
import {handleNotifyHost} from './external-system';
import {ReactorContext} from "../../../shared";
import {handle} from "./handle";


const handleBookingRequestedEvent: SingleRecordedMessageHandlerWithContext<
    BookingRequested,
    InMemoryReadEventMetadata,
    ReactorContext> = async (recordedEvent, context): Promise<MessageHandlerResult> => {
    const { eventStore } = context;
    try {
        await handleNotifyHost({
            type: 'NotifyHost',
            kind: 'Command',
            data: {
                hostId: recordedEvent.data.hostId,
                notificationType: 'booking_request',
                priority: 'high',
                channels: ['email', 'push', 'sms'],
                message: recordedEvent.data.message,
                actionRequired: true,
            },
            metadata: {
                now: new Date(),
            },
        });
        await handle(eventStore, recordedEvent);
        return;
    } catch (error) {
        console.error(`❌ Host notification failed for booking ${recordedEvent.data.bookingId}:`, error);
        return {
            type: 'STOP',
            reason: `Host notification failed: ${error}`,
        };
    }
};

export const setup = async (eventStore: InMemoryEventStore, commandSender: CommandSender) => {
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