import { Products } from './product.state';

// Re-export types for external use
export type { ProductCatalog, Product } from './product.state';

// Define Integration interface locally to avoid import issues
interface Integration<T extends string = string> {
  readonly __brand: 'Integration';
  readonly type: T;
  readonly name: string;
}

export const ProductCatalogService: Integration<'product-catalog'> = {
  __brand: 'Integration' as const,
  type: 'product-catalog' as const,
  name: 'ProductCatalogService',
};

export const ProductCatalogServiceImplementation = {
  State: {
    Products: (_params: unknown): Products => {
      // fetch data from remote source
      return {
        type: 'Products',
        data: {
          products: [],
        },
      };
    },
  },
  Commands: {
    // Future commands for product catalog management
    Foo: (_params: unknown) => {
      return {
        type: 'Foo',
        data: {
          foo: 'bar',
        },
      };
    },
  },
  Events: {
    // Future events from product catalog changes
  },
};
// when I create an integration, I need to make sure it's commands and queries are on the gql server as mutations and queries
// which means we can use the Apollo MCP to call the integration from the AI module
