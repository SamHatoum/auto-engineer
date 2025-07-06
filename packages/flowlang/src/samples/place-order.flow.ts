import { flow, should, specs } from '../flow';
import { commandSlice } from '../fluent-builder';
import { when } from '../testing';
import { createBuilders } from '../builders';

export interface OrderPlaced {
    type: 'OrderPlaced';
    data: {
        orderId: string;
        productId: string;
        quantity: number;
        placedAt: Date;
    };
}

export interface PlaceOrderFlow {
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

const { Events, Commands } = createBuilders()
    .events<OrderPlaced>()
    .commands<PlaceOrderFlow>()
    .state<{ orders: OrderSummary[] }>();

flow('Place order', () => {
    commandSlice('Submit order')
        .stream('order-${orderId}')
        .client(() => {
            specs('Order submission form', () => {
                should('allow product selection');
                should('allow quantity input');
            });
        })
        .server(() => {
            specs('User submits a new order', () => {
                when(
                    Commands.PlaceOrder({
                        productId: 'product_789',
                        quantity: 3
                    })
                ).then([
                    Events.OrderPlaced({
                        orderId: 'order_001',
                        productId: 'product_789',
                        quantity: 3,
                        placedAt: new Date('2024-01-20T10:00:00Z')
                    })
                ]);
            });
        });
});