import type { State, Integration } from '@auto-engineer/flowlang';
import axios from 'axios';

export type Product = {
  productId: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
  imageUrl: string;
};

export type Products = State<
  'Products',
  {
    products: Product[];
  }
>;

export type ProductsByCategory = State<
  'ProductsByCategory',
  {
    category: string;
    products: Product[];
  }
>;

export type ProductSearchResults = State<
  'ProductSearchResults',
  {
    query: string;
    products: Product[];
  }
>;

export type ProductDetails = State<
  'ProductDetails',
  {
    product: Product | null;
  }
>;

const client = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ProductCatalog: Integration<'product-catalog'> = {
  __brand: 'Integration' as const,
  type: 'product-catalog' as const,
  name: 'ProductCatalogService',
  State: {
    Products: async (): Promise<Products> => {
      try {
        const products = (await client.get<Product[]>('/api/products')).data;
        return {
          type: 'Products',
          data: {
            products,
          },
        };
      } catch (error) {
        console.error('Failed to fetch products:', error);
        return {
          type: 'Products',
          data: {
            products: [],
          },
        };
      }
    },
    ProductsByCategory: async (params: { category: string }): Promise<ProductsByCategory> => {
      try {
        const products = (await client.get<Product[]>(`/api/products/category/${params.category}`)).data;
        return {
          type: 'ProductsByCategory',
          data: {
            category: params.category,
            products,
          },
        };
      } catch (error) {
        console.error(`Failed to fetch products for category ${params.category}:`, error);
        return {
          type: 'ProductsByCategory',
          data: {
            category: params.category,
            products: [],
          },
        };
      }
    },
    ProductSearchResults: async (params: { query: string }): Promise<ProductSearchResults> => {
      try {
        const products = (await client.get<Product[]>('/api/products/search', {
          params: { q: params.query },
        })).data;
        return {
          type: 'ProductSearchResults',
          data: {
            query: params.query,
            products,
          },
        };
      } catch (error) {
        console.error(`Failed to search products with query "${params.query}":`, error);
        return {
          type: 'ProductSearchResults',
          data: {
            query: params.query,
            products: [],
          },
        };
      }
    },
    ProductDetails: async (params: { id: string }): Promise<ProductDetails> => {
      try {
        const product = (await client.get<Product>(`/api/products/${params.id}`)).data;
        return {
          type: 'ProductDetails',
          data: {
            product,
          },
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return {
            type: 'ProductDetails',
            data: {
              product: null,
            },
          };
        }
        console.error(`Failed to fetch product details for ID ${params.id}:`, error);
        return {
          type: 'ProductDetails',
          data: {
            product: null,
          },
        };
      }
    }
  },
  Events: {},
};