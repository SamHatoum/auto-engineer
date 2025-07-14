import { Router, type Request, type Response } from 'express';
import { 
  CartItem, 
  cartSessions, 
  calculateCartTotal, 
  getOrCreateCartSession 
} from '../data/cart';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - name
 *         - price
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           description: Unique identifier for the product
 *         name:
 *           type: string
 *           description: Product name
 *         price:
 *           type: number
 *           description: Product price in dollars
 *         quantity:
 *           type: number
 *           description: Quantity of the product in cart
 *     CartSession:
 *       type: object
 *       required:
 *         - sessionId
 *         - items
 *         - total
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Unique cart session identifier
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *           description: Array of items in the cart
 *         total:
 *           type: number
 *           description: Total cost of all items in cart
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the cart session was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the cart was last updated
 */

/**
 * @swagger
 * /api/cart/{sessionId}:
 *   get:
 *     summary: Get cart by session ID
 *     description: Retrieve the cart contents for a specific session
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart session identifier
 *     responses:
 *       200:
 *         description: Cart session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSession'
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const cartSession = getOrCreateCartSession(sessionId);
  res.json(cartSession);
});

/**
 * @swagger
 * /api/cart/{sessionId}/add:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the cart with specified quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart session identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - name
 *               - price
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product identifier
 *               name:
 *                 type: string
 *                 description: Product name
 *               price:
 *                 type: number
 *                 description: Product price
 *               quantity:
 *                 type: number
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSession'
 *       400:
 *         description: Invalid request data
 */
router.post('/:sessionId/add', (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const { productId, name, price, quantity } = req.body as {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  };

  if (!productId || !name || price === undefined || !quantity) {
    return res.status(400).json({ 
      error: 'Missing required fields: productId, name, price, quantity' 
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  const cartSession = getOrCreateCartSession(sessionId);
  const existingItemIndex = cartSession.items.findIndex(item => item.productId === productId);

  if (existingItemIndex >= 0) {
    // Update existing item quantity
    cartSession.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    const newItem: CartItem = { productId, name, price, quantity };
    cartSession.items.push(newItem);
  }

  // Update cart total and timestamp
  cartSession.total = calculateCartTotal(cartSession.items);
  cartSession.updatedAt = new Date().toISOString();

  cartSessions.set(sessionId, cartSession);
  res.json(cartSession);
});

/**
 * @swagger
 * /api/cart/{sessionId}/remove:
 *   post:
 *     summary: Remove item from cart
 *     description: Remove a product from the cart or reduce its quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart session identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product identifier to remove
 *               quantity:
 *                 type: number
 *                 description: Quantity to remove (optional, removes all if not specified)
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSession'
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Product not found in cart
 */
router.post('/:sessionId/remove', (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const { productId, quantity } = req.body as {
    productId: string;
    quantity?: number;
  };

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const cartSession = getOrCreateCartSession(sessionId);
  const itemIndex = cartSession.items.findIndex(item => item.productId === productId);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Product not found in cart' });
  }

  const item = cartSession.items[itemIndex];
  const removeQuantity = quantity ?? item.quantity;

  if (removeQuantity >= item.quantity) {
    // Remove entire item
    cartSession.items.splice(itemIndex, 1);
  } else {
    // Reduce quantity
    cartSession.items[itemIndex].quantity -= removeQuantity;
  }

  // Update cart total and timestamp
  cartSession.total = calculateCartTotal(cartSession.items);
  cartSession.updatedAt = new Date().toISOString();

  cartSessions.set(sessionId, cartSession);
  res.json(cartSession);
});

/**
 * @swagger
 * /api/cart/{sessionId}/clear:
 *   post:
 *     summary: Clear cart
 *     description: Remove all items from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart session identifier
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSession'
 */
router.post('/:sessionId/clear', (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const cartSession = getOrCreateCartSession(sessionId);
  
  cartSession.items = [];
  cartSession.total = 0;
  cartSession.updatedAt = new Date().toISOString();

  cartSessions.set(sessionId, cartSession);
  res.json(cartSession);
});

export default router; 