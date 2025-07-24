/**
 * This example demonstrates the type safety of the context-aware data() function
 */
import { commandSlice, querySlice, reactSlice, flow, data, sink, source } from '../index';
import { createIntegration } from '../types';

// Example integrations
const EmailService = createIntegration('email', 'EmailService');
const PaymentGateway = createIntegration('payment', 'PaymentGateway');

flow('Type Safety Examples', () => {
  // Command Slice - Only sinks allowed
  commandSlice('Process order').server(() => {
    // ✅ Valid - command slices can have sinks
    data([
      sink().event('OrderProcessed').toStream('orders-${orderId}'),
      sink().command('SendEmail').toIntegration(EmailService, 'SendOrderConfirmation', 'command'),
    ]);

    // ❌ This would be a TypeScript error:
    // data([
    //   source().state('Config').fromDatabase('config') // Error: Type 'DataSourceItem' is not assignable to type 'DataSinkItem'
    // ]);
  });

  // Query Slice - Only sources allowed
  querySlice('Get order history').server(() => {
    // ✅ Valid - query slices can have sources
    data([
      source().state('OrderHistory').fromProjection('OrderHistoryProjection', 'id'),
      source().state('CustomerProfile').fromDatabase('customers'),
    ]);

    // ❌ This would be a TypeScript error:
    // data([
    //   sink().event('DataQueried').toStream('queries') // Error: Type 'DataSinkItem' is not assignable to type 'DataSourceItem'
    // ]);
  });

  // React Slice - Both sinks and sources allowed
  reactSlice('Handle payment').server(() => {
    // ✅ Valid - react slices can mix both
    data([
      source().state('PaymentConfig').fromDatabase('config'),
      sink().command('ChargePayment').toIntegration(PaymentGateway, 'Charge', 'command'),
      sink().event('PaymentCharged').toStream('payments-${orderId}'),
    ]);

    // ✅ Also valid - only sinks
    data([sink().event('ReactionTriggered').toTopic('reactions')]);

    // ✅ Also valid - only sources
    data([source().state('ReactionConfig').fromApi('/api/config', 'GET')]);
  });
});

// The type system ensures:
// 1. Command slices can only accept arrays of DataSinkItem
// 2. Query slices can only accept arrays of DataSourceItem
// 3. React slices can accept arrays mixing both DataSinkItem and DataSourceItem
