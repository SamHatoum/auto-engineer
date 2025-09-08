import type { State, Integration } from '@auto-engineer/flow';

import { createClient } from './generated/product-catalog/client';
import type {
  ProductCatalogItem,
  GetApiProductsResponses,
  GetApiProductsSearchResponses,
  GetApiProductsSearchErrors,
  GetApiProductsCategoryByCategoryResponses,
  GetApiProductsByIdResponses,
  GetApiProductsByIdErrors,
} from './generated/product-catalog';

export type Product = ProductCatalogItem;

export type Products = State<'Products', { products: Product[] }>;
export type ProductsByCategory = State<'ProductsByCategory', { category: string; products: Product[] }>;
export type ProductSearchResults = State<'ProductSearchResults', { query: string; products: Product[] }>;
export type ProductDetails = State<'ProductDetails', { product: Product | null }>;

// ---------- Generated client instance ----------
const productClient = createClient({
  baseUrl: 'http://localhost:3001',
});

// ---------- Integration facade ----------
type ProductCatalogQueries = {
  Products: () => Promise<Products>;
  ProductsByCategory: (params: { category: string }) => Promise<ProductsByCategory>;
  ProductSearchResults: (params: { query: string }) => Promise<ProductSearchResults>;
  ProductDetails: (params: { id: string }) => Promise<ProductDetails>;
};

const _ProductCatalog: Integration<'product-catalog', ProductCatalogQueries> = {
  __brand: 'Integration' as const,
  type: 'product-catalog' as const,
  name: 'product-catalog',

  Queries: {
    // GET /api/products
    Products: async (): Promise<Products> => {
      try {
        const res = await productClient.get<GetApiProductsResponses, unknown, false>({ url: '/api/products' });
        if (res.error !== undefined) console.error('Failed to fetch products:', res.error);
        return { type: 'Products', data: { products: (res.data as Product[]) ?? [] } };
      } catch (err) {
        console.error('Failed to fetch products:', err);
        return { type: 'Products', data: { products: [] as Product[] } };
      }
    },

    // GET /api/products/category/{category}
    ProductsByCategory: async ({ category }): Promise<ProductsByCategory> => {
      try {
        const res = await productClient.get<GetApiProductsCategoryByCategoryResponses, unknown, false>({
          url: '/api/products/category/{category}',
          path: { category },
        });
        if (res.error !== undefined) console.error(`Category "${category}" error:`, res.error);
        return { type: 'ProductsByCategory', data: { category, products: (res.data as Product[]) ?? [] } };
      } catch (err) {
        console.error(`Failed to fetch products for category ${category}:`, err);
        return { type: 'ProductsByCategory', data: { category, products: [] as Product[] } };
      }
    },

    // GET /api/products/search?q=...
    ProductSearchResults: async ({ query }): Promise<ProductSearchResults> => {
      try {
        const res = await productClient.get<GetApiProductsSearchResponses, GetApiProductsSearchErrors, false>({
          url: '/api/products/search',
          query: { q: query },
        });
        if (res.error !== undefined) console.error(`Search "${query}" error:`, res.error);
        return { type: 'ProductSearchResults', data: { query, products: (res.data as Product[]) ?? [] } };
      } catch (err) {
        console.error(`Failed to search products with query "${query}":`, err);
        return { type: 'ProductSearchResults', data: { query, products: [] as Product[] } };
      }
    },

    // GET /api/products/{id}
    ProductDetails: async ({ id }): Promise<ProductDetails> => {
      try {
        const res = await productClient.get<GetApiProductsByIdResponses, GetApiProductsByIdErrors, false>({
          url: '/api/products/{id}',
          path: { id },
        });
        if (res.response.status === 404 || res.error !== undefined) {
          if (res.response.status !== 404) console.error(`Error fetching product "${id}":`, res.error);
          return { type: 'ProductDetails', data: { product: null } };
        }
        return { type: 'ProductDetails', data: { product: res.data ?? null } };
      } catch (err) {
        console.error(`Failed to fetch product details for ID ${id}:`, err);
        return { type: 'ProductDetails', data: { product: null } };
      }
    },
  },
};
