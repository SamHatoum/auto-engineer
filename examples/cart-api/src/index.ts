import express, { type Express } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cartRouter from './routes/cart';

const app: Express = express();
const PORT: string = process.env.PORT ?? '3002';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cart Service API',
      version: '1.0.0',
      description: 'A cart management service with interactive documentation',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/cart.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());

// Swagger UI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/docs', ...(swaggerUi.serve as any), swaggerUi.setup(swaggerSpec) as any);

// Routes
app.use('/api/cart', cartRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cart service running on port ${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
  });
}

export default app;
