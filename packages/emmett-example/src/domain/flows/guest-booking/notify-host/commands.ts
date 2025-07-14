import type { Command } from '@event-driven-io/emmett';
export type NotifyHost = Command<
    'NotifyHost',
    {
        hostId: string;
        bookingId: string;
        notificationType: 'booking_request';
        priority: 'high';
        channels: ('email' | 'push' | 'sms')[];
        message: string;
        actionRequired: boolean;
    }
>;