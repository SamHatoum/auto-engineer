import {
    CommandHandler,
    reactor,
    type EventStore,
    type CommandSender,
    type SingleRecordedMessageHandlerWithContext,
    type InMemoryReadEventMetadata,
    type MessageHandlerResult
} from '@event-driven-io/emmett';
import type { BookingRequested } from '../guest-submits-booking-request/events';
import { HostManagesBookingRequestWorkflow } from './workflow';
import { evolve } from './evolve';
import { initialWorkflowState } from './state';
import { handleNotifyHost } from './external-system';
import type { HostNotified } from './events';

type ReactorContext = {
    eventStore: EventStore;
    commandSender: CommandSender;
};

const handleWorkflowState = CommandHandler<any, HostNotified>({
    evolve,
    initialState: initialWorkflowState,
});

const handleBookingRequestedEvent: SingleRecordedMessageHandlerWithContext<
    BookingRequested,
    InMemoryReadEventMetadata,
    ReactorContext
> = async (recordedEvent, context): Promise<MessageHandlerResult> => {
    const { eventStore } = context;
    const event = recordedEvent as any;

    const workflowId = `host-manages-booking-${event.data.bookingId}`;

    try {
        await handleWorkflowState(
            eventStore,
            workflowId,
            async (currentState) => {
                const outputs = HostManagesBookingRequestWorkflow.decide(event, currentState);
                let hostNotifiedEvent: HostNotified | null = null;
                for (const output of outputs) {
                    switch (output.action) {
                        case 'Send':
                            if (output.message.type === 'NotifyHost') {
                                await handleNotifyHost(output.message);
                                console.log(`📧 Host ${output.message.data.hostId} notified about booking ${event.data.bookingId}`);
                                hostNotifiedEvent = {
                                    type: 'HostNotified',
                                    data: {
                                        workflowId,
                                        bookingId: event.data.bookingId,
                                        hostId: output.message.data.hostId,
                                        notificationType: output.message.data.notificationType,
                                        channels: output.message.data.channels,
                                        notifiedAt: new Date().toISOString(),
                                    },
                                };
                            }
                            break;
                        case 'Complete':
                            console.log(`✅ Host notification workflow completed for booking ${event.data.bookingId}`);
                            break;
                        case 'Ignore':
                            console.log(`⏭️ Host notification ignored for booking ${event.data.bookingId}: ${output.reason}`);
                            break;
                        case 'Accept':
                            console.log(`✔️ Host notification workflow accepted for booking ${event.data.bookingId}`);
                            break;
                        case 'Error':
                            console.error(`❌ Host notification workflow error for booking ${event.data.bookingId}: ${output.reason}`);
                            break;
                        default:
                            console.log(`🔄 Host notification workflow action: ${output.action}`);
                    }
                }
                return hostNotifiedEvent ? [hostNotifiedEvent] : [];
            }
        );

        console.log(`✅ Host notification workflow completed for booking ${event.data.bookingId}`);
        return;

    } catch (error) {
        console.error(`❌ Host notification workflow failed for booking ${event.data.bookingId}:`, error);

        return {
            type: 'STOP',
            reason: `Host notification workflow failed: ${error}`,
        };
    }
};

export const setup = async (eventStore: EventStore, commandSender: CommandSender) => {
    const context: ReactorContext = {
        eventStore,
        commandSender,
    };
    const workflowReactor = reactor<
        BookingRequested,
        InMemoryReadEventMetadata,
        ReactorContext
    >({
        processorId: 'host-manages-booking-request-workflow',
        canHandle: ['BookingRequested'],
        eachMessage: handleBookingRequestedEvent,
    });

    await workflowReactor.start(context);
    console.log('Host notification workflow reactor started');
    return {
        workflowReactor,
    };
};