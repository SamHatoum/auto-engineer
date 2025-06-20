import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialNotificationState } from './state';
import type { BookingRequested } from '../guest-submits-booking-request/events';
import type { HostNotified } from './events';
import { describe, it, expect } from 'vitest';

describe('HostNotification | BookingRequested', () => {
    const now = new Date();

    const bookingRequestedEvent: BookingRequested = {
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
    };

    const expectedEvent: HostNotified = {
        type: 'HostNotified',
        data: {
            bookingId: 'booking-123',
            hostId: 'host-789',
            notificationType: 'booking_request',
            channels: ['email', 'push', 'sms'],
            notifiedAt: now.toISOString(),
        },
    };

    const given = DeciderSpecification.for({
        decide,
        evolve,
        initialState: initialNotificationState,
    });

    it('should emit HostNotified when notification state is Initial', () => {
        // Test the decide function directly since timestamps are dynamic
        const initialState = initialNotificationState();
        const result = decide(bookingRequestedEvent, initialState);

        // Verify the event structure
        expect(result.type).toBe('HostNotified');
        expect(result.data.bookingId).toBe('booking-123');
        expect(result.data.hostId).toBe('host-789');
        expect(result.data.notificationType).toBe('booking_request');
        expect(result.data.channels).toEqual(['email', 'push', 'sms']);

        // Verify timestamp is a valid ISO string and recent
        expect(result.data.notifiedAt).toBeDefined();
        expect(() => new Date(result.data.notifiedAt)).not.toThrow();
        expect(new Date(result.data.notifiedAt).getTime()).toBeCloseTo(Date.now(), -2);
    });

    it('should throw if host already notified for this booking', () => {
        given([
            expectedEvent,
        ])
            .when(bookingRequestedEvent)
            .thenThrows((e) => e.message === 'Host already notified for this booking');
    });

    it('should evolve state correctly after notification', () => {
        // Test the evolve function directly
        const initialState = initialNotificationState();
        const finalState = evolve(initialState, expectedEvent);

        expect(finalState).toEqual({
            status: 'Notified',
            hostId: 'host-789',
            notifiedAt: now.toISOString(),
        });
    });
});