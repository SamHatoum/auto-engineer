import { Router, type Request, type Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { mockProducts } from '../data/products';

const router: ExpressRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCatalogItem:
 *       type: object
 *       required:
 *         - productId
 *         - name
 *         - category
 *         - price
 *         - tags
 *       properties:
 *         productId:
 *           type: string
 *           description: Unique identifier for the product
 *         name:
 *           type: string
 *           description: Product name
 *         category:
 *           type: string
 *           description: Product category
 *         price:
 *           type: number
 *           description: Product price in dollars
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tags associated with the product
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products in the catalog
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductCatalogItem'
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(mockProducts);
});

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     description: Search products by name or tags
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for product name or tags
 *     responses:
 *       200:
 *         description: List of matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductCatalogItem'
 *       400:
 *         description: Query parameter is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/search', (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const products = mockProducts.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );
  res.json(products);
});

/**
 * @swagger
 * /api/products/category/{category}:
 *   get:
 *     summary: Get products by category
 *     description: Retrieve all products in a specific category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name to filter by
 *     responses:
 *       200:
 *         description: List of products in the category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductCatalogItem'
 */
router.get('/category/:category', (req: Request, res: Response) => {
  const { category } = req.params as { category: string };
  const products = mockProducts.filter(p => 
    p.category.toLowerCase() === category.toLowerCase()
  );
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a specific product by its ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductCatalogItem'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = mockProducts.find(p => p.productId === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

export default router; 