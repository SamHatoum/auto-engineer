import type { State, Integration } from '@auto-engineer/flowlang';
import axios from 'axios';
import { z } from '@auto-engineer/ai-gateway';

export const CartItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export const CartSessionSchema = z.object({
  sessionId: z.string(),
  items: z.array(CartItemSchema),
  total: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartSession = {
  sessionId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type CartState = State<'Cart', CartSession>;

export type CartAddedState = State<'CartAdded', CartSession>;

export type CartRemovedState = State<'CartRemoved', CartSession>;

export type CartClearedState = State<'CartCleared', CartSession>;

const client = axios.create({
  baseURL: 'http://localhost:3002',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type CartQueries = {
  Cart: (params: { sessionId: string }) => Promise<CartState>;
};

type CartCommands = {
  AddToCart: (params: {
    sessionId: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }) => Promise<CartAddedState>;
  RemoveFromCart: (params: { sessionId: string; productId: string; quantity?: number }) => Promise<CartRemovedState>;
  ClearCart: (params: { sessionId: string }) => Promise<CartClearedState>;
};

export const Cart: Integration<'cart', CartQueries, CartCommands> = {
  __brand: 'Integration' as const,
  type: 'cart' as const,
  name: 'cart',
  Queries: {
    schema: {
      Cart: z.object({
        sessionId: z.string(),
      }),
    },
    Cart: async (params: { sessionId: string }): Promise<CartState> => {
      try {
        const cartSession = (await client.get<CartSession>(`/api/cart/${params.sessionId}`)).data;
        return {
          type: 'Cart',
          data: cartSession,
        };
      } catch (error) {
        console.error(`Failed to fetch cart for session ${params.sessionId}:`, error);
        return {
          type: 'Cart',
          data: {
            sessionId: params.sessionId,
            items: [],
            total: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }
    },
  },
  Commands: {
    schema: {
      AddToCart: z.object({
        sessionId: z.string(),
        productId: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
      }),
      RemoveFromCart: z.object({
        sessionId: z.string(),
        productId: z.string(),
        quantity: z.number().optional(),
      }),
      ClearCart: z.object({
        sessionId: z.string(),
      }),
    },
    AddToCart: async (params: {
      sessionId: string;
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }): Promise<CartAddedState> => {
      try {
        const cartSession = (
          await client.post<CartSession>(`/api/cart/${params.sessionId}/add`, {
            productId: params.productId,
            name: params.name,
            price: params.price,
            quantity: params.quantity,
          })
        ).data;
        return {
          type: 'CartAdded',
          data: cartSession,
        };
      } catch (error) {
        console.error(`Failed to add item to cart for session ${params.sessionId}:`, error);
        throw error;
      }
    },
    RemoveFromCart: async (params: {
      sessionId: string;
      productId: string;
      quantity?: number;
    }): Promise<CartRemovedState> => {
      try {
        const requestBody: { productId: string; quantity?: number } = {
          productId: params.productId,
        };
        if (params.quantity !== undefined) {
          requestBody.quantity = params.quantity;
        }

        const cartSession = (await client.post<CartSession>(`/api/cart/${params.sessionId}/remove`, requestBody)).data;
        return {
          type: 'CartRemoved',
          data: cartSession,
        };
      } catch (error) {
        console.error(`Failed to remove item from cart for session ${params.sessionId}:`, error);
        throw error;
      }
    },
    ClearCart: async (params: { sessionId: string }): Promise<CartClearedState> => {
      try {
        const cartSession = (await client.post<CartSession>(`/api/cart/${params.sessionId}/clear`)).data;
        return {
          type: 'CartCleared',
          data: cartSession,
        };
      } catch (error) {
        console.error(`Failed to clear cart for session ${params.sessionId}:`, error);
        throw error;
      }
    },
  },
};
