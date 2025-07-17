# Product Catalogue Integration

This example demonstrates how to convert a REST API into commands and state queries using the Auto Engineer flowlang patterns.

## Overview

The integration converts:
- **GET endpoints** → **State queries** (read operations)
- **POST endpoints** → **Commands** (write operations that emit events)

## API Conversion

### Products API (GET → State)
- `GET /api/products` → `Products` state
- `GET /api/products/search?q=query` → `ProductSearchResults` state
- `GET /api/products/category/{category}` → `ProductsByCategory` state
- `GET /api/products/{id}` → `ProductDetails` state

### Cart API
- `GET /api/cart/{sessionId}` → `CartState` state
- `POST /api/cart/{sessionId}/add` → `AddItemToCart` command → `ItemAddedToCart` event
- `POST /api/cart/{sessionId}/remove` → `RemoveItemFromCart` command → `ItemRemovedFromCart` event
- `POST /api/cart/{sessionId}/clear` → `ClearCart` command → `CartCleared` event

## Usage

```typescript
import { ProductCatalogService } from '@examples/product-catalogue-integration';

// State queries (converted from GET endpoints)
const products = await ProductCatalogService.State!.Products();
const searchResults = await ProductCatalogService.State!.ProductSearchResults({ query: 'laptop' });
const categoryProducts = await ProductCatalogService.State!.ProductsByCategory({ category: 'electronics' });
const productDetails = await ProductCatalogService.State!.ProductDetails({ id: 'product-123' });
const cartState = await ProductCatalogService.State!.CartState({ sessionId: 'user-session' });

// Commands (converted from POST endpoints)
const addCommand = {
  type: 'AddItemToCart',
  data: {
    sessionId: 'user-session',
    productId: 'product-123',
    name: 'Laptop',
    price: 999.99,
    quantity: 1,
  },
};
const addEvent = await ProductCatalogService.Commands!.AddItemToCart(addCommand);
```

## Testing

The integration includes comprehensive unit tests that:

1. **Start/stop the REST service programmatically** for testing
2. **Test all state queries** (GET endpoint conversions)
3. **Test all commands** (POST endpoint conversions)
4. **Test error handling** and edge cases
5. **Test complete workflows** (browse → add to cart → checkout flow)

### Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode (with UI)
pnpm test:ui
```

The tests automatically:
- Start the REST API server on port 3002
- Run all integration tests
- Stop the server when complete

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   REST API      │    │   Integration    │    │   Commands &    │
│   (Express)     │◄───┤   Layer          │────┤   State Queries │
│   Ports 3001/2  │    │   (Axios Client) │    │   (FlowLang)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Files

- `src/product-catalogue.ts` - Main integration with command/state handlers
- `src/api-client.ts` - HTTP client for REST API calls
- `src/product.state.ts` - Product-related state type definitions
- `src/cart.types.ts` - Cart-related command, event, and state types
- `src/product-catalogue.test.ts` - Comprehensive integration tests
- `src/example.ts` - Usage examples

This pattern allows you to gradually migrate from REST APIs to event-driven, CQRS-based architectures while maintaining compatibility with existing services.