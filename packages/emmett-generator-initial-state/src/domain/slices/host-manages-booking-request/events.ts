import type {Event} from '@event-driven-io/emmett';

export type HostNotificationWorkflowStarted = Event<
    'HostNotificationWorkflowStarted',
    {
        workflowId: string;
        bookingId: string;
        triggeredAt: string;
    }
>;

export type HostNotified = Event<
    'HostNotified',
    {
        workflowId: string;
        bookingId: string;
        hostId: string;
        notificationType: string;
        channels: string[];
        notifiedAt: string;
    }
>;

export type HostNotificationWorkflowCompleted = Event<
    'HostNotificationWorkflowCompleted',
    {
        workflowId: string;
        bookingId: string;
        completedAt: string;
    }
>;