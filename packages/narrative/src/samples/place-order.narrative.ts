import { flow, should, specs, rule, example } from '../narrative';
import { command } from '../fluent-builder';

export interface OrderPlaced {
  type: 'OrderPlaced';
  data: {
    orderId: string;
    productId: string;
    quantity: number;
    placedAt: Date;
  };
}

export interface PlaceOrderNarrative {
  type: 'PlaceOrder';
  data: {
    productId: string;
    quantity: number;
  };
}

export interface OrderSummary {
  type: 'OrderSummary';
  data: {
    orderId: string;
    productId: string;
    quantity: number;
  };
}

flow('Place order', () => {
  command('Submit order')
    .stream('order-${orderId}')
    .client(() => {
      specs('Order submission form', () => {
        should('allow product selection');
        should('allow quantity input');
      });
    })
    .server(() => {
      specs('User submits a new order', () => {
        rule('Valid orders should be processed successfully', () => {
          example('User places order for available product')
            .when<PlaceOrderNarrative>({
              productId: 'product_789',
              quantity: 3,
            })
            .then<OrderPlaced>({
              orderId: 'order_001',
              productId: 'product_789',
              quantity: 3,
              placedAt: new Date('2024-01-20T10:00:00Z'),
            });
        });
      });
    });
});
