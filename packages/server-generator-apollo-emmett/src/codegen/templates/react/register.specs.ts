import { describe, it, expect } from 'vitest';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flow';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('register.ts.ejs (react slice)', () => {
  it('should generate correct register.ts', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'manage bookings',
          slices: [
            {
              type: 'command',
              name: 'guest submits booking request',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Guest submits booking request command',
                  rules: [
                    {
                      description: 'Should handle booking request successfully',
                      examples: [
                        {
                          description: 'User submits booking request successfully',
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
                  ],
                },
              },
            },
            {
              type: 'react',
              name: 'Send notification to host',
              server: {
                description: 'Sends a host notification command in response to BookingRequested',
                specs: {
                  name: 'Send notification to host reaction',
                  rules: [
                    {
                      description: 'Should send host notification on booking request',
                      examples: [
                        {
                          description: 'Booking request triggers host notification',
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
                  ],
                },
              },
            },
            {
              type: 'command',
              name: 'notify host',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Notify host command',
                  rules: [
                    {
                      description: 'Should notify host successfully',
                      examples: [
                        {
                          description: 'Host notification sent successfully',
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
                  ],
                },
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
    const registerFile = plans.find((p) => p.outputPath.endsWith('send-notification-to-host/register.ts'));

    expect(registerFile?.contents).toMatchInlineSnapshot(`
          "import { type CommandSender, type EventSubscription, type InMemoryEventStore } from '@event-driven-io/emmett';
          import type { BookingRequested } from '../guest-submits-booking-request/events';

          export async function register(messageBus: CommandSender & EventSubscription, eventStore: InMemoryEventStore) {
            messageBus.subscribe(async (event: BookingRequested) => {
              /**
               * ## IMPLEMENTATION INSTRUCTIONS ##
               *
               * - Replace the placeholder logic with the  real implementation.
               * - Send one or more commands via: messageBus.send({...})
               */

              // await messageBus.send({
              //   type: 'NotifyHost',
              //   kind: 'Command',
              //   data: {
              //     // Map event fields to command fields here
              //     // e.g., userId: event.data.userId,
              //   },
              // });

              return;
            }, 'BookingRequested');
          }
          "
        `);
  });
});
