import { describe, it, expect } from 'vitest';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('react.specs.ts.ejs (react slice)', () => {
  it('should generate correct react.specs.ts', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'manage bookings',
          slices: [
            {
              type: 'command',
              name: 'guest submits booking request',
              client: { description: '', specs: [] },
              server: {
                description: '',
                gwt: [
                  {
                    when: {
                      commandRef: 'RequestBooking',
                      exampleData: {
                        propertyId: 'listing_123',
                        hostId: 'host_123',
                        guestId: 'guest_456',
                        checkIn: '2025-07-15',
                        checkOut: '2025-07-18',
                        guests: 2,
                        message: 'Looking forward to my stay!',
                        metadata: { now: 'bar', bookingId: '123' },
                      },
                    },
                    then: [
                      {
                        eventRef: 'BookingRequested',
                        exampleData: {
                          bookingId: 'book_xyz789',
                          hostId: 'host_123',
                          propertyId: 'prop_789',
                          guestId: 'guest_456',
                          checkIn: '2025-07-15',
                          checkOut: '2025-07-18',
                          guests: 2,
                          message: 'Hey',
                          status: 'pending_host_approval',
                          requestedAt: '2025-06-10T16:30:00.000Z',
                          expiresAt: '2025-06-11T16:30:00.000Z',
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              type: 'react',
              name: 'Send notification to host',
              server: {
                description: 'Sends a host notification command in response to BookingRequested',
                gwt: [
                  {
                    when: [
                      {
                        eventRef: 'BookingRequested',
                        exampleData: {
                          bookingId: 'book_xyz789',
                          hostId: 'host_123',
                          propertyId: 'prop_789',
                          guestId: 'guest_456',
                          checkIn: '2025-07-15',
                          checkOut: '2025-07-18',
                          guests: 2,
                          message: 'Hey',
                          status: 'pending_host_approval',
                          requestedAt: '2025-06-10T16:30:00.000Z',
                          expiresAt: '2025-06-11T16:30:00.000Z',
                        },
                      },
                    ],
                    then: [
                      {
                        commandRef: 'NotifyHost',
                        exampleData: {
                          hostId: 'host_123',
                          notificationType: 'booking_request',
                          priority: 'high',
                          channels: ['email', 'push'],
                          message: 'A guest has requested to book your place.',
                          actionRequired: true,
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              type: 'command',
              name: 'notify host',
              client: { description: '', specs: [] },
              server: {
                description: '',
                gwt: [
                  {
                    when: {
                      commandRef: 'NotifyHost',
                      exampleData: {
                        hostId: 'host_123',
                        notificationType: 'booking_request',
                        priority: 'high',
                        channels: ['email', 'push'],
                        message: 'A guest has requested to book your place.',
                        actionRequired: true,
                      },
                    },
                    then: [
                      {
                        eventRef: 'HostNotified',
                        exampleData: {
                          bookingId: 'book_xyz789',
                          hostId: 'host_123',
                          notificationType: 'booking_request',
                          channels: ['email', 'push'],
                          message: 'hi.',
                          notifiedAt: '2025-06-10T16:30:00.000Z',
                          actionRequired: true,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'command',
          name: 'RequestBooking',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'hostId', type: 'string', required: true },
            { name: 'guestId', type: 'string', required: true },
            { name: 'checkIn', type: 'date', required: true },
            { name: 'checkOut', type: 'date', required: true },
            { name: 'guests', type: 'number', required: true },
            { name: 'message', type: 'string', required: false },
          ],
        },
        {
          type: 'command',
          name: 'NotifyHost',
          fields: [
            { name: 'hostId', type: 'string', required: true },
            { name: 'notificationType', type: 'string', required: true },
            { name: 'priority', type: 'string', required: true },
            { name: 'channels', type: 'string[]', required: true },
            { name: 'message', type: 'string', required: true },
            { name: 'actionRequired', type: 'boolean', required: true },
          ],
        },
        {
          type: 'event',
          name: 'BookingRequested',
          source: 'internal',
          fields: [
            { name: 'bookingId', type: 'string', required: true },
            { name: 'hostId', type: 'string', required: true },
            { name: 'message', type: 'string', required: true },
          ],
        },
        {
          type: 'event',
          name: 'HostNotified',
          source: 'internal',
          fields: [
            { name: 'bookingId', type: 'string', required: true },
            { name: 'hostId', type: 'string', required: true },
            { name: 'notificationType', type: 'string', required: true },
            { name: 'channels', type: 'string[]', required: true },
            { name: 'notifiedAt', type: 'date', required: true },
            { name: 'actionRequired', type: 'boolean', required: true },
            { name: 'message', type: 'string', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');

    const specFile = plans.find((p) => p.outputPath.endsWith('react.specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
          "import { describe, it, beforeEach } from 'vitest';
          import 'reflect-metadata';
          import { getInMemoryEventStore, type InMemoryEventStore } from '@event-driven-io/emmett';
          import { type ReactorContext, ReactorSpecification } from '../../../shared';
          import { react } from './react';
          import type { BookingRequested } from '../guest-submits-booking-request/events';

          describe('ManageBookings | SendNotificationToHost', () => {
            let eventStore: InMemoryEventStore;
            let given: ReturnType<typeof ReactorSpecification.for<any, any, ReactorContext>>;

            beforeEach(() => {
              eventStore = getInMemoryEventStore({});
              given = ReactorSpecification.for(react(), (commandSender) => ({ eventStore, commandSender }));
            });

            it('should send NotifyHost when BookingRequested is received', async () => {
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
                    message: 'Hey',
                    status: 'pending_host_approval',
                    requestedAt: '2025-06-10T16:30:00.000Z',
                    expiresAt: '2025-06-11T16:30:00.000Z',
                  },
                })
                .then([
                  {
                    type: 'NotifyHost',
                    kind: 'Command',
                    data: {
                      hostId: 'host_123',
                      notificationType: 'booking_request',
                      priority: 'high',
                      channels: ['email', 'push'],
                      message: 'A guest has requested to book your place.',
                      actionRequired: true,
                    },
                  },
                ]);
            });
          });
          "
        `);
  });
});
