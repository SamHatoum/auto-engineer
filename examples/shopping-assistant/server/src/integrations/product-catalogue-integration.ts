import type { State, Integration } from '@auto-engineer/flowlang';
import axios from 'axios';
import { registerTool, z } from '@auto-engineer/ai-gateway';

export const ProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  tags: z.array(z.string()),
  imageUrl: z.string().url(),
});

export const ProductsSchema = z.object({
  type: z.literal('Products'),
  data: z.object({
    products: z.array(ProductSchema),
  }),
});


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
  Queries: {
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
};

// Register MCP tools for ProductCatalog queries

// Type definitions for query functions
type ProductsQuery = () => Promise<Products>;
type ProductsByCategoryQuery = (params: { category: string }) => Promise<ProductsByCategory>;
type ProductSearchQuery = (params: { query: string }) => Promise<ProductSearchResults>;
type ProductDetailsQuery = (params: { id: string }) => Promise<ProductDetails>;

// Tool for fetching all products
registerTool<Record<string, unknown>>(
  'PRODUCT_CATALOGUE_PRODUCTS',
  {
    title: 'Get All Products',
    description: 'Fetches all products from the product catalog',
    inputSchema: {},
    schema: ProductsSchema,
    schemaName: 'Products',
    schemaDescription: 'A list of products with id, name, category, price, tags, and imageUrl',
  },
  async () => {
    const queries = ProductCatalog.Queries;
    if (!queries?.Products) {
      return {
        content: [{
          type: 'text' as const,
          text: 'ProductCatalog.Queries.Products is not available',
        }],
        isError: true,
      };
    }
    const productsQuery = queries.Products as ProductsQuery;
    const result = await productsQuery();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  }
);

// Tool for fetching products by category
interface ProductsByCategoryParams extends Record<string, unknown> {
  category: string;
}

registerTool<ProductsByCategoryParams>(
  'PRODUCT_CATALOGUE_PRODUCTS_BY_CATEGORY',
  {
    title: 'Get Products by Category',
    description: 'Fetches products from a specific category',
    inputSchema: {
      category: z.string().min(1, 'Category is required'),
    },
  },
  async ({ category }) => {
    const queries = ProductCatalog.Queries;
    if (!queries?.ProductsByCategory) {
      return {
        content: [{
          type: 'text' as const,
          text: 'ProductCatalog.Queries.ProductsByCategory is not available',
        }],
        isError: true,
      };
    }
    const categoryQuery = queries.ProductsByCategory as ProductsByCategoryQuery;
    const result = await categoryQuery({ category });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  }
);

// Tool for searching products
interface ProductSearchParams extends Record<string, unknown> {
  query: string;
}

registerTool<ProductSearchParams>(
  'PRODUCT_CATALOGUE_SEARCH',
  {
    title: 'Search Products',
    description: 'Search for products using a query string',
    inputSchema: {
      query: z.string().min(1, 'Search query is required'),
    },
  },
  async ({ query }) => {
    const queries = ProductCatalog.Queries;
    if (!queries?.ProductSearchResults) {
      return {
        content: [{
          type: 'text' as const,
          text: 'ProductCatalog.Queries.ProductSearchResults is not available',
        }],
        isError: true,
      };
    }
    const searchQuery = queries.ProductSearchResults as ProductSearchQuery;
    const result = await searchQuery({ query });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  }
);

// Tool for getting product details
interface ProductDetailsParams extends Record<string, unknown> {
  id: string;
}

registerTool<ProductDetailsParams>(
  'PRODUCT_CATALOGUE_PRODUCT_DETAILS',
  {
    title: 'Get Product Details',
    description: 'Fetches detailed information about a specific product',
    inputSchema: {
      id: z.string().min(1, 'Product ID is required'),
    },
  },
  async ({ id }) => {
    const queries = ProductCatalog.Queries;
    if (!queries?.ProductDetails) {
      return {
        content: [{
          type: 'text' as const,
          text: 'ProductCatalog.Queries.ProductDetails is not available',
        }],
        isError: true,
      };
    }
    const detailsQuery = queries.ProductDetails as ProductDetailsQuery;
    const result = await detailsQuery({ id });
    if (result.data.product === null) {
      return {
        content: [{
          type: 'text' as const,
          text: `Product with ID "${id}" not found`,
        }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  }
);