export interface ProductCatalogItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
}

export const mockProducts: ProductCatalogItem[] = [
  {
    productId: 'prod-soccer-ball',
    name: 'Super Soccer Ball',
    category: 'Sports',
    price: 10,
    tags: ['soccer', 'sports']
  },
  {
    productId: 'prod-craft-kit',
    name: 'Deluxe Craft Kit',
    category: 'Arts & Crafts',
    price: 25,
    tags: ['crafts', 'art', 'creative']
  },
  {
    productId: 'prod-laptop-bag',
    name: 'Tech Laptop Backpack',
    category: 'School Supplies',
    price: 45,
    tags: ['computers', 'tech', 'school']
  },
  {
    productId: 'prod-mtg-starter',
    name: 'Magic the Gathering Starter Set',
    category: 'Games',
    price: 30,
    tags: ['magic', 'tcg', 'games']
  },
  {
    productId: 'prod-pencils',
    name: 'Colorful Pencil Set',
    category: 'School Supplies',
    price: 8,
    tags: ['school', 'art', 'writing']
  },
  {
    productId: 'prod-notebook',
    name: 'Spiral Notebook',
    category: 'School Supplies',
    price: 5,
    tags: ['school', 'writing', 'paper']
  },
  {
    productId: 'prod-running-shoes',
    name: 'Kids Running Shoes',
    category: 'Sports',
    price: 35,
    tags: ['sports', 'running', 'shoes']
  },
  {
    productId: 'prod-paint-set',
    name: 'Watercolor Paint Set',
    category: 'Arts & Crafts',
    price: 15,
    tags: ['art', 'paint', 'creative']
  },
  {
    productId: 'prod-craft-glue',
    name: 'All-Purpose Craft Glue',
    category: 'Arts & Crafts',
    price: 6,
    tags: ['crafts', 'glue', 'art']
  }
]; 