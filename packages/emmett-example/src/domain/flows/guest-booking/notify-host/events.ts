import type { Event } from '@event-driven-io/emmett';

export type HostNotified = Event<
    'HostNotified',
    {
        bookingId: string;
        hostId: string;
        notificationType: string;
        channels: string[];
        message?: string;
        notifiedAt: Date;
        actionRequired?: boolean;
    }
>;