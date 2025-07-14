import {describe, it, beforeEach} from 'vitest';
import 'reflect-metadata';
import {
    getInMemoryEventStore,
    type InMemoryEventStore,
} from '@event-driven-io/emmett';
import  {type ReactorContext, ReactorSpecification} from '../../../shared';
import {react} from './react';
import type {BookingRequested} from '../guest-submits-booking-request/events';
import type {NotifyHost} from '../notify-host/commands';

describe('HostManagesBookingRequest | Email Confirmation Policy', () => {
    let eventStore: InMemoryEventStore;
    let given: ReturnType<typeof ReactorSpecification.for<BookingRequested, NotifyHost, ReactorContext>>;

    beforeEach(() => {
        eventStore = getInMemoryEventStore({});
        given = ReactorSpecification.for(
            react(),
            (commandSender) => ({ eventStore, commandSender})
        );
    });

    it('should send NotifyHost command when BookingRequested event is received', async () => {
        await given([])
            .when({
                type: 'BookingRequested',
                data: {
                    bookingId: 'book_xyz789',
                    hostId: 'host_123',
                    propertyId: 'prop_789',
                    guestId: 'guest_456',
                    checkIn: '2025-07-15',
                    checkOut: '2025-07-18',
                    guests: 2,
                    message: 'Looking forward to staying at your place!',
                    status: 'pending_host_approval',
                    requestedAt: '2025-06-10T16:30:00.000Z',
                    expiresAt: '2025-06-11T16:30:00.000Z',
                },
            })
            .then({
                type: 'NotifyHost',
                kind: 'Command',
                data: {
                    hostId: 'host_123',
                    bookingId: 'book_xyz789',
                    notificationType: 'booking_request',
                    priority: 'high',
                    channels: ['push', 'email', 'sms'],
                    message: 'Looking forward to staying at your place!',
                    actionRequired: true,
                },
            });
    });

    it('should skip NotifyHost command if status is not pending_host_approval', async () => {
        await given([])
            .when({
                type: 'BookingRequested',
                data: {
                    bookingId: 'book_123',
                    hostId: 'host_999',
                    propertyId: 'prop_999',
                    guestId: 'guest_999',
                    checkIn: '2025-08-01',
                    checkOut: '2025-08-10',
                    guests: 3,
                    message: 'Excited to stay!',
                    status: 'confirmed',
                    requestedAt: '2025-07-01T10:00:00.000Z',
                    expiresAt: '2025-07-02T10:00:00.000Z',
                },
            })
            .thenNothingHappened();
    });

});