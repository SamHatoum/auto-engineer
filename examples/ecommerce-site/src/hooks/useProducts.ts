import { useQuery } from '@tanstack/react-query';

export interface Product {
  id: number;
  name: string;
  price: string; // formatted like '$25.00'
  imageUrl: string;
  category: string;
  tags: string[];
}

interface BackendProduct {
  productId: string;
  name: string;
  price: number;
  category: string;
  tags: string[];
  imageUrl: string;
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');

      const rawProducts: BackendProduct[] = await res.json();

      return rawProducts.map((product, index) => ({
        id: index + 1,
        name: product.name,
        price: `$${product.price.toFixed(2)}`,
        imageUrl: product.imageUrl,
        category: product.category,
        tags: product.tags,
      }));
    },
  });
}
