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
      'https://plus.unsplash.com/premium_photo-1658506638118-524a66dc5cee?q=80&w=3544&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-craft-kit',
    name: 'Deluxe Craft Kit',
    category: 'Arts & Crafts',
    price: 25,
    tags: ['crafts', 'art', 'creative'],
    imageUrl: 'https://m.media-amazon.com/images/I/81ekd9gpb5L._UF894,1000_QL80_.jpg',
  },
  {
    productId: 'prod-laptop-bag',
    name: 'Tech Laptop Backpack',
    category: 'School Supplies',
    price: 45,
    tags: ['computers', 'tech', 'school'],
    imageUrl:
      'https://images.unsplash.com/photo-1630522521764-9ec0064a7e6e?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-mtg-starter',
    name: 'Magic the Gathering Starter Set',
    category: 'Games',
    price: 30,
    tags: ['magic', 'tcg', 'games'],
    imageUrl:
      'https://www.fantasywelt.de/media/image/product/183022/lg/magic-the-gathering-bloomburrow-starter-kit-2024-en.jpg',
  },
  {
    productId: 'prod-pencils',
    name: 'Colorful Pencil Set',
    category: 'School Supplies',
    price: 8,
    tags: ['school', 'art', 'writing'],
    imageUrl:
      'https://images.unsplash.com/photo-1616014578457-c7f3cd043291?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-notebook',
    name: 'Spiral Notebook',
    category: 'School Supplies',
    price: 5,
    tags: ['school', 'writing', 'paper'],
    imageUrl:
      'https://images.unsplash.com/photo-1598620616337-cb8f766489bd?q=80&w=1943&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-running-shoes',
    name: 'Kids Running Shoes',
    category: 'Sports',
    price: 35,
    tags: ['sports', 'running', 'shoes'],
    imageUrl:
      'https://images.unsplash.com/photo-1571395770221-867c6e2251bc?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    productId: 'prod-paint-set',
    name: 'Watercolor Paint Set',
    category: 'Arts & Crafts',
    price: 15,
    tags: ['art', 'paint', 'creative'],
    imageUrl:
      'https://images.unsplash.com/photo-1748100377329-429f657842de?q=80&w=3534&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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
