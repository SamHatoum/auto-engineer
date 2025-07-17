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
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_0f2394de-3e15-409c-8345-69b0bf919809',
  },
  {
    productId: 'prod-craft-kit',
    name: 'Deluxe Craft Kit',
    category: 'Arts & Crafts',
    price: 25,
    tags: ['crafts', 'art', 'creative'],
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_5130a51a-0117-4203-ba7f-f1fe7aa218bb',
  },
  {
    productId: 'prod-laptop-bag',
    name: 'Tech Laptop Backpack',
    category: 'School Supplies',
    price: 45,
    tags: ['computers', 'tech', 'school'],
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_794814ba-fb85-4be6-863c-d1764d1f1792',
  },
  {
    productId: 'prod-mtg-starter',
    name: 'Magic the Gathering Starter Set',
    category: 'Games',
    price: 30,
    tags: ['magic', 'tcg', 'games'],
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_c164af43-fe9d-4a34-a9cb-281eb5c73742',
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
