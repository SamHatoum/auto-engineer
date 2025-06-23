import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialNotificationState } from './state';
import { describe, it, expect } from 'vitest';

import type { BookingRequested } from '../guest-submits-booking-request';
import type { HostNotified } from './events';
import type { NotificationState } from './state';

describe('HostNotification | BookingRequested', () => {
    const now = new Date();

    const given = DeciderSpecification.for<BookingRequested, HostNotified, NotificationState>({
        decide,
        evolve,
        initialState: initialNotificationState,
    });

    it('should emit HostNotified when not previously notified', () => {
        given([])
            .when({
                type: 'BookingRequested',
                data: {
                    bookingId: 'booking-123',
                    propertyId: 'property-abc',
                    hostId: 'host-789',
                    guestId: 'guest-456',
                    checkIn: '2025-07-01',
                    checkOut: '2025-07-07',
                    guests: 2,
                    message: 'Looking forward to staying at your property!',
                    status: 'pending_host_approval',
                    requestedAt: now.toISOString(),
                    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                },
            })
            .then([
                {
                    type: 'HostNotified',
                    data: {
                        bookingId: 'booking-123',
                        hostId: 'host-789',
                        notificationType: 'booking_request',
                        channels: ['email', 'push', 'sms'],
                        notifiedAt: now
                    },
                },
            ]);
    });

    it('should throw if host already notified', () => {
        return given([
            {
                type: 'HostNotified',
                data: {
                    bookingId: 'booking-123',
                    hostId: 'host-789',
                    notificationType: 'booking_request',
                    channels: ['email', 'push', 'sms'],
                    notifiedAt: now,
                },
            },
        ])
            .when({
                type: 'BookingRequested',
                data: {
                    bookingId: 'booking-123',
                    propertyId: 'property-abc',
                    hostId: 'host-789',
                    guestId: 'guest-456',
                    checkIn: '2025-07-01',
                    checkOut: '2025-07-07',
                    guests: 2,
                    message: 'Looking forward to staying!',
                    status: 'pending_host_approval',
                    requestedAt: now.toISOString(),
                    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
                },
            })
            .thenThrows((e) => e.message === 'Host already notified for this booking');
    });
});