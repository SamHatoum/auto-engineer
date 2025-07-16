import { useQuery } from '@tanstack/react-query';
import { useProducts } from './useProducts';

export interface CartItem {
  id: number;
  name: string;
  price: string; // formatted like "$30.00"
  imageUrl: string;
  quantity: number;
}

interface BackendCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface BackendCartSession {
  sessionId: string;
  items: BackendCartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface CartResponse {
  items: CartItem[];
}

export function useCart(sessionId: string) {
  const { data: products } = useProducts();

  return useQuery<CartResponse>({
    queryKey: ['cart', sessionId, products],
    enabled: !!sessionId && !!products,
    queryFn: async () => {
      const res = await fetch(`http://localhost:3002/api/cart/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      const backendCart: BackendCartSession = await res.json();

      const items: CartItem[] = backendCart.items.map((item, index) => {
        const product = products?.find(
          (p) => p.name === item.name || p.id.toString() === item.productId,
        );

        return {
          id: index + 1,
          name: item.name,
          price: `$${(item.price * item.quantity).toFixed(2)}`,
          imageUrl: product?.imageUrl ?? '',
          quantity: item.quantity,
        };
      });

      return { items };
    },
  });
}
