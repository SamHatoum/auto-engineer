export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartSession {
  sessionId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for cart sessions
export const cartSessions: Map<string, CartSession> = new Map();

// Helper function to calculate cart total
export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Helper function to create a new cart session
export const createCartSession = (sessionId: string): CartSession => {
  const now = new Date().toISOString();
  const cartSession: CartSession = {
    sessionId,
    items: [],
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
  cartSessions.set(sessionId, cartSession);
  return cartSession;
};

// Helper function to get or create cart session
export const getOrCreateCartSession = (sessionId: string): CartSession => {
  let cartSession = cartSessions.get(sessionId);
  if (!cartSession) {
    cartSession = createCartSession(sessionId);
  }
  return cartSession;
};
