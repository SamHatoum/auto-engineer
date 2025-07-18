/**
 * Example demonstrating the array-based data flow API
 */
import { commandSlice, querySlice, reactSlice, flow, sink, source, data } from '../index';
import { createIntegration } from '../types';

// Example integrations
const EmailService = createIntegration('email', 'EmailService');
const PaymentGateway = createIntegration('payment', 'PaymentGateway');

flow('E-commerce Order Flow', () => {
  // Command slice with multiple sinks
  commandSlice('Process order').server(() => {
    data([
      // Event sink with field selection and stream routing
      sink().event('OrderProcessed').fields({ orderId: true, customerId: true }).toStream('orders-${orderId}'),

      // Command sink to external integration
      sink().command('SendOrderEmail').toIntegration(EmailService),

      // State sink to database
      sink().state('OrderSummary').toDatabase('order_summaries'),
    ]);
  });

  // Query slice with multiple sources
  querySlice('Order dashboard').server(() => {
    data([
      // From event-sourced projection
      source().state('OrderSummary').fromProjection('OrderSummaryProjection', 'id'),

      // From database with query
      source()
        .state('CustomerOrders')
        .fromDatabase('orders', {
          status: { $in: ['pending', 'processing'] },
        }),

      // From external API
      source().state('ShippingStatus').fromApi('https://shipping.api/status', 'GET'),
    ]);
  });

  // React slice mixing sources and sinks
  reactSlice('Handle payment confirmation').server(() => {
    data([
      // Read payment configuration
      source().state('PaymentConfig').fromDatabase('config'),

      // Read customer preferences
      source().state('CustomerPreferences').fromReadModel('CustomerPreferencesModel'),

      // Send payment command
      sink().command('ProcessPayment').toIntegration(PaymentGateway),

      // Emit payment event
      sink().event('PaymentProcessed').toStream('payments-${orderId}'),

      // Update order state
      sink().state('OrderStatus').toDatabase('orders'),
    ]);
  });
});

/**
 * Key Features Demonstrated:
 *
 * 1. Array-based API: All data flows are arrays of sinks/sources
 * 2. Context awareness: Command slices only have sinks, query only sources
 * 3. Field selection: Choose specific fields with .fields()
 * 4. Multiple destinations: Stream, integration, database, topic
 * 5. Multiple origins: Projection, read model, database, API
 * 6. React flexibility: Can mix both sinks and sources
 */
