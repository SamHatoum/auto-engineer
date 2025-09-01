import type { State, Integration } from '@auto-engineer/flow';
import { registerTool, z } from '@auto-engineer/ai-gateway';

import { createClient as createCartClient } from './generated/cart/client';
import type {
  CartSession,
  GetApiCartBySessionIdResponses,
  PostApiCartBySessionIdAddResponses,
  PostApiCartBySessionIdAddErrors,
  PostApiCartBySessionIdRemoveResponses,
  PostApiCartBySessionIdRemoveErrors,
  PostApiCartBySessionIdClearResponses,
} from './generated/cart';
import {
  zGetApiCartBySessionIdResponse,
  zPostApiCartBySessionIdAddResponse,
  zPostApiCartBySessionIdRemoveResponse,
  zPostApiCartBySessionIdClearResponse,
} from './generated/cart/zod.gen';

// ---------- State ----------
export type CartState = State<'Cart', { cart: CartSession }>;

// ---------- Client ----------
const cartClient = createCartClient({ baseUrl: 'http://localhost:3002' });

// ---------- Integration facade ----------
type CartQueries = {
  GetCart: (p: { sessionId: string }) => Promise<CartState>;
};
type CartCommands = {
  AddItem: (p: {
    sessionId: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }) => Promise<CartState>;
  RemoveItem: (p: { sessionId: string; productId: string; quantity: number }) => Promise<CartState>;
  Clear: (p: { sessionId: string }) => Promise<CartState>;
};

export const Cart: Integration<'cart', CartQueries, CartCommands> = {
  __brand: 'Integration' as const,
  type: 'cart',
  name: 'cart',

  Queries: {
    // GET /api/cart/{sessionId}
    GetCart: async ({ sessionId }) => {
      const res = await cartClient.get<GetApiCartBySessionIdResponses, unknown, false>({
        url: '/api/cart/{sessionId}',
        path: { sessionId },
      });
      if (res.error !== undefined) {
        console.error(`GetCart error for "${sessionId}":`, res.error);
        const now = new Date().toISOString();
        return { type: 'Cart', data: { cart: { sessionId, items: [], total: 0, createdAt: now, updatedAt: now } } };
      }
      return { type: 'Cart', data: { cart: res.data! } };
    },
  },

  Commands: {
    // POST /api/cart/{sessionId}/add
    AddItem: async ({ sessionId, productId, name, price, quantity }) => {
      const res = await cartClient.post<PostApiCartBySessionIdAddResponses, PostApiCartBySessionIdAddErrors, false>({
        url: '/api/cart/{sessionId}/add',
        path: { sessionId },
        body: { productId, name, price, quantity },
      });
      if (res.error !== undefined) {
        console.error(`AddItem error for "${sessionId}":`, res.error);
        // fall back to current cart
        const fallback = await cartClient.get<GetApiCartBySessionIdResponses, unknown, false>({
          url: '/api/cart/{sessionId}',
          path: { sessionId },
        });
        return { type: 'Cart', data: { cart: fallback.data! } };
      }
      return { type: 'Cart', data: { cart: res.data! } };
    },

    // POST /api/cart/{sessionId}/remove
    RemoveItem: async ({ sessionId, productId, quantity }) => {
      const res = await cartClient.post<
        PostApiCartBySessionIdRemoveResponses,
        PostApiCartBySessionIdRemoveErrors,
        false
      >({
        url: '/api/cart/{sessionId}/remove',
        path: { sessionId },
        body: { productId, quantity },
      });
      if (res.error !== undefined) {
        console.error(`RemoveItem error for "${sessionId}":`, res.error);
        const fallback = await cartClient.get<GetApiCartBySessionIdResponses, unknown, false>({
          url: '/api/cart/{sessionId}',
          path: { sessionId },
        });
        return { type: 'Cart', data: { cart: fallback.data! } };
      }
      return { type: 'Cart', data: { cart: res.data! } };
    },

    // POST /api/cart/{sessionId}/clear
    Clear: async ({ sessionId }) => {
      const res = await cartClient.post<PostApiCartBySessionIdClearResponses, unknown, false>({
        url: '/api/cart/{sessionId}/clear',
        path: { sessionId },
      });
      if (res.error !== undefined) {
        console.error(`Clear error for "${sessionId}":`, res.error);
        const fallback = await cartClient.get<GetApiCartBySessionIdResponses, unknown, false>({
          url: '/api/cart/{sessionId}',
          path: { sessionId },
        });
        return { type: 'Cart', data: { cart: fallback.data! } };
      }
      return { type: 'Cart', data: { cart: res.data! } };
    },
  },
};

// ---------- MCP tools  ----------
registerTool<{ sessionId: string }>(
  'CART_GET',
  {
    title: 'Get Cart',
    description: 'Fetch a cart session by ID',
    inputSchema: { sessionId: z.string().min(1) },
    schema: zGetApiCartBySessionIdResponse,
    schemaName: 'CartSession',
    schemaDescription: 'Cart session details',
  },
  async ({ sessionId }) => {
    const res = await Cart.Queries!.GetCart({ sessionId });
    return { content: [{ type: 'text' as const, text: JSON.stringify(res.data.cart, null, 2) }] };
  },
);

registerTool<{ sessionId: string; productId: string; name: string; price: number; quantity: number }>(
  'CART_ADD',
  {
    title: 'Add Item to Cart',
    description: 'Add an item to the cart',
    inputSchema: {
      sessionId: z.string().min(1),
      productId: z.string().min(1),
      name: z.string().min(1),
      price: z.number(),
      quantity: z.number().int().positive(),
    },
    schema: zPostApiCartBySessionIdAddResponse,
    schemaName: 'CartSession',
    schemaDescription: 'Updated cart',
  },
  async (args) => {
    const res = await Cart.Commands!.AddItem(args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(res.data.cart, null, 2) }] };
  },
);

registerTool<{ sessionId: string; productId: string; quantity: number }>(
  'CART_REMOVE',
  {
    title: 'Remove Item from Cart',
    description: 'Remove or decrement an item in the cart',
    inputSchema: {
      sessionId: z.string().min(1),
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    },
    schema: zPostApiCartBySessionIdRemoveResponse,
    schemaName: 'CartSession',
    schemaDescription: 'Updated cart',
  },
  async (args) => {
    const res = await Cart.Commands!.RemoveItem(args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(res.data.cart, null, 2) }] };
  },
);

registerTool<{ sessionId: string }>(
  'CART_CLEAR',
  {
    title: 'Clear Cart',
    description: 'Remove all items from the cart',
    inputSchema: { sessionId: z.string().min(1) },
    schema: zPostApiCartBySessionIdClearResponse,
    schemaName: 'CartSession',
    schemaDescription: 'Updated cart',
  },
  async ({ sessionId }) => {
    const res = await Cart.Commands!.Clear({ sessionId });
    return { content: [{ type: 'text' as const, text: JSON.stringify(res.data.cart, null, 2) }] };
  },
);
