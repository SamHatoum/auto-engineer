import type { State } from '@auto-engineer/flowlang';

export type Product = {
  productId: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
};

export type Products = State<
    'Products',
    {
      products: Product[]
    }
  >;

export type ProductCatalog = Product[];