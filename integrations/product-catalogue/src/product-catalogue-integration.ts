import type { State, Integration } from '@auto-engineer/flowlang';
import { registerTool, z } from '@auto-engineer/ai-gateway';

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
import {
  zGetApiProductsResponse,
  zGetApiProductsSearchResponse,
  zGetApiProductsCategoryByCategoryResponse,
  zGetApiProductsByIdResponse,
} from './generated/product-catalog/zod.gen';

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

export const ProductCatalog: Integration<'product-catalog', ProductCatalogQueries> = {
  __brand: 'Integration' as const,
  type: 'product-catalog' as const,
  name: 'product-catalog',

  Queries: {
    // GET /api/products
    Products: async (): Promise<Products> => {
      try {
        const res = await productClient.get<GetApiProductsResponses, unknown, false>({
          url: '/api/products',
        });
        if (res.error !== undefined) console.error('Failed to fetch products:', res.error);
        return { type: 'Products', data: { products: res.data ?? [] } };
      } catch (err) {
        console.error('Failed to fetch products:', err);
        return { type: 'Products', data: { products: [] } };
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
        return { type: 'ProductsByCategory', data: { category, products: res.data ?? [] } };
      } catch (err) {
        console.error(`Failed to fetch products for category ${category}:`, err);
        return { type: 'ProductsByCategory', data: { category, products: [] } };
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
        return { type: 'ProductSearchResults', data: { query, products: res.data ?? [] } };
      } catch (err) {
        console.error(`Failed to search products with query "${query}":`, err);
        return { type: 'ProductSearchResults', data: { query, products: [] } };
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
          if (res.response.status !== 404) {
            console.error(`Error fetching product "${id}":`, res.error);
          }
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

// ---------- MCP tools  ----------

type ProductsQuery = () => Promise<Products>;
type ProductsByCategoryQuery = (params: { category: string }) => Promise<ProductsByCategory>;
type ProductSearchQuery = (params: { query: string }) => Promise<ProductSearchResults>;
type ProductDetailsQuery = (params: { id: string }) => Promise<ProductDetails>;

// All products
registerTool<Record<string, unknown>>(
  'PRODUCT_CATALOGUE_PRODUCTS',
  {
    title: 'Get All Products',
    description: 'Fetches all products from the product catalog',
    inputSchema: {},
    schema: zGetApiProductsResponse,
    schemaName: 'GetApiProductsResponse',
    schemaDescription: 'Array of ProductCatalogItem',
  },
  async () => {
    const queries = ProductCatalog.Queries;
    if (queries?.Products == null) {
      return {
        content: [{ type: 'text' as const, text: 'ProductCatalog.Queries.Products is not available' }],
        isError: true,
      };
    }
    const productsQuery = queries.Products as ProductsQuery;
    const result = await productsQuery();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data.products, null, 2) }] };
  },
);

// By category
interface ProductsByCategoryParams extends Record<string, unknown> {
  category: string;
}
registerTool<ProductsByCategoryParams>(
  'PRODUCT_CATALOGUE_PRODUCTS_BY_CATEGORY',
  {
    title: 'Get Products by Category',
    description: 'Fetches products from a specific category',
    inputSchema: { category: z.string().min(1, 'Category is required') },
    schema: zGetApiProductsCategoryByCategoryResponse,
    schemaName: 'GetApiProductsCategoryByCategoryResponse',
    schemaDescription: 'Array of ProductCatalogItem',
  },
  async ({ category }) => {
    const queries = ProductCatalog.Queries;
    if (queries?.ProductsByCategory == null) {
      return {
        content: [{ type: 'text' as const, text: 'ProductCatalog.Queries.ProductsByCategory is not available' }],
        isError: true,
      };
    }
    const categoryQuery = queries.ProductsByCategory as ProductsByCategoryQuery;
    const result = await categoryQuery({ category });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data.products, null, 2) }] };
  },
);

// Search
interface ProductSearchParams extends Record<string, unknown> {
  query: string;
}
registerTool<ProductSearchParams>(
  'PRODUCT_CATALOGUE_SEARCH',
  {
    title: 'Search Products',
    description: 'Search for products using a query string',
    inputSchema: { query: z.string().min(1, 'Search query is required') },
    schema: zGetApiProductsSearchResponse,
    schemaName: 'GetApiProductsSearchResponse',
    schemaDescription: 'Array of ProductCatalogItem',
  },
  async ({ query }) => {
    const queries = ProductCatalog.Queries;
    if (queries?.ProductSearchResults == null) {
      return {
        content: [{ type: 'text' as const, text: 'ProductCatalog.Queries.ProductSearchResults is not available' }],
        isError: true,
      };
    }
    const searchQuery = queries.ProductSearchResults as ProductSearchQuery;
    const result = await searchQuery({ query });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data.products, null, 2) }] };
  },
);

// Details
interface ProductDetailsParams extends Record<string, unknown> {
  id: string;
}
registerTool<ProductDetailsParams>(
  'PRODUCT_CATALOGUE_PRODUCT_DETAILS',
  {
    title: 'Get Product Details',
    description: 'Fetches detailed information about a specific product',
    inputSchema: { id: z.string().min(1, 'Product ID is required') },
    schema: zGetApiProductsByIdResponse,
    schemaName: 'GetApiProductsByIdResponse',
    schemaDescription: 'Single ProductCatalogItem',
  },
  async ({ id }) => {
    const queries = ProductCatalog.Queries;
    if (queries?.ProductDetails == null) {
      return {
        content: [{ type: 'text' as const, text: 'ProductCatalog.Queries.ProductDetails is not available' }],
        isError: true,
      };
    }
    const detailsQuery = queries.ProductDetails as ProductDetailsQuery;
    const result = await detailsQuery({ id });
    if (result.data.product === null) {
      return { content: [{ type: 'text' as const, text: `Product with ID "${id}" not found` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data.product, null, 2) }] };
  },
);
