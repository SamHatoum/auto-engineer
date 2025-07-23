export interface ProductCatalogItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
  imageUrl: string;
}

export const mockProducts: ProductCatalogItem[] = [
  {
    productId: 'prod-soccer-ball',
    name: 'Super Soccer Ball',
    category: 'Sports',
    price: 10,
    tags: ['soccer', 'sports'],
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-craft-kit',
    name: 'Deluxe Craft Kit',
    category: 'Arts & Crafts',
    price: 25,
    tags: ['crafts', 'art', 'creative'],
    imageUrl:
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-laptop-bag',
    name: 'Tech Laptop Backpack',
    category: 'School Supplies',
    price: 45,
    tags: ['computers', 'tech', 'school'],
    imageUrl:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-mtg-starter',
    name: 'Magic the Gathering Starter Set',
    category: 'Games',
    price: 30,
    tags: ['magic', 'tcg', 'games'],
    imageUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-pencils',
    name: 'Colorful Pencil Set',
    category: 'School Supplies',
    price: 8,
    tags: ['school', 'art', 'writing'],
    imageUrl:
      'https://images.unsplash.com/photo-1572045188875-61013d06e517?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-notebook',
    name: 'Spiral Notebook',
    category: 'School Supplies',
    price: 5,
    tags: ['school', 'writing', 'paper'],
    imageUrl:
      'https://plus.unsplash.com/premium_photo-1684332005387-09423f85bdbb?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-running-shoes',
    name: 'Kids Running Shoes',
    category: 'Sports',
    price: 35,
    tags: ['sports', 'running', 'shoes'],
    imageUrl:
      'https://plus.unsplash.com/premium_photo-1661674577243-43cc46faabfb?q=80&w=3542&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-paint-set',
    name: 'Watercolor Paint Set',
    category: 'Arts & Crafts',
    price: 15,
    tags: ['art', 'paint', 'creative'],
    imageUrl:
      'https://images.unsplash.com/photo-1658402995914-22a4ba7e1a94?q=80&w=3546&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-craft-glue',
    name: 'All-Purpose Craft Glue',
    category: 'Arts & Crafts',
    price: 6,
    tags: ['crafts', 'glue', 'art'],
    imageUrl:
      'https://images.unsplash.com/photo-1511944239253-86eb39473667?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
];
