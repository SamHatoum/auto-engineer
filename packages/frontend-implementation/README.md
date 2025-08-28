# @auto-engineer/frontend-implementation

AI-powered frontend implementation plugin for the Auto Engineer CLI that implements client-side code with AI assistance. This plugin creates React components, hooks, and application logic from specifications and design requirements.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/frontend-implementation
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/frontend-implementation',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `implement:client` - Implement client-side code with AI assistance

## What does this plugin do?

The Frontend Implementation plugin uses AI capabilities to implement React applications, including components, pages, hooks, and business logic. It understands design systems, GraphQL schemas, and user experience requirements to create functional user interfaces.

## Key Features

### AI React Development

- Generates functional React components from specifications
- Implements custom hooks for state management and API interactions
- Creates responsive layouts and interactive user interfaces
- Integrates with design systems and component libraries

### GraphQL Integration

- Generates Apollo Client queries and mutations
- Implements optimistic updates and error handling
- Creates type-safe GraphQL operations
- Handles loading states and data caching

### Design System Awareness

- Uses imported design tokens and components consistently
- Follows established design patterns and UI conventions
- Implements accessibility standards and best practices
- Maintains visual consistency across the application

### User Experience Focus

- Implements intuitive user workflows and navigation
- Handles edge cases and error scenarios gracefully
- Creates responsive designs for mobile and desktop
- Optimizes for performance and user experience

## Implementation Patterns

### Page Component Implementation

The plugin creates complete page implementations:

```typescript
// Before (generated stub)
export function OrderHistoryPage() {
  // TODO: Implement order history display
  return <div>Order History - Not implemented</div>;
}

// After (AI implementation)
export function OrderHistoryPage() {
  const { data, loading, error, refetch } = useOrderHistoryQuery({
    variables: { customerId: useCurrentUser().id },
    errorPolicy: 'partial'
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (loading) return <LoadingSpinner message="Loading your orders..." />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return (
    <PageLayout title="Order History" breadcrumbs={[{ label: 'Orders', href: '/orders' }]}>
      <div className="space-y-6">
        <OrderFilters onFilterChange={handleFilterChange} />

        {data?.orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="You haven't placed any orders yet."
            action={<Button href="/products">Start Shopping</Button>}
          />
        ) : (
          <OrderList
            orders={data?.orders || []}
            onSelectOrder={setSelectedOrder}
          />
        )}

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            isOpen={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}
```

### Custom Hook Implementation

Creates reusable hooks for complex logic:

```typescript
// Implements data fetching and state management
export function useOrderManagement() {
  const [placeOrderMutation] = usePlaceOrderMutation();
  const [cancelOrderMutation] = useCancelOrderMutation();
  const [orders, setOrders] = useState<Order[]>([]);

  const placeOrder = useCallback(
    async (orderData: PlaceOrderInput) => {
      try {
        const result = await placeOrderMutation({
          variables: { input: orderData },
          optimisticResponse: {
            placeOrder: {
              __typename: 'Order',
              id: `temp-${Date.now()}`,
              status: OrderStatus.Pending,
              ...orderData,
            },
          },
          update: (cache, { data }) => {
            if (data?.placeOrder) {
              cache.modify({
                fields: {
                  orders: (existing = []) => [...existing, data.placeOrder],
                },
              });
            }
          },
        });

        return result.data?.placeOrder;
      } catch (error) {
        throw new OrderPlacementError('Failed to place order', error);
      }
    },
    [placeOrderMutation],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      // Implementation with optimistic updates and error handling
    },
    [cancelOrderMutation],
  );

  return { placeOrder, cancelOrder, orders };
}
```

### Component Implementation

Creates feature-rich, accessible components:

```typescript
// Implements interactive components with full functionality
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToast } = useToast();

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await onAddToCart(product.id);
      addToast({
        type: 'success',
        message: `${product.name} added to cart`
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to add item to cart'
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {!imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-lg">
            <ImageIcon className="text-gray-400" size={48} />
          </div>
        )}

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>

          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-primary">
              ${product.price.toFixed(2)}
            </span>

            <Button
              onClick={handleAddToCart}
              disabled={isAdding || !product.inStock}
              className="min-w-24"
            >
              {isAdding ? (
                <Spinner size="sm" />
              ) : !product.inStock ? (
                'Out of Stock'
              ) : (
                'Add to Cart'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Configuration Options

Customize implementation behavior:

```typescript
// auto.config.ts
export default {
  plugins: [
    [
      '@auto-engineer/frontend-implementation',
      {
        // AI model configuration
        model: 'claude-3-sonnet',

        // Framework preferences
        framework: 'react',
        stateManagement: 'apollo-client',

        // UI library integration
        designSystem: 'shadcn/ui',
        iconLibrary: 'lucide-react',

        // Implementation preferences
        includeAccessibility: true,
        includeAnimations: true,
        includeErrorBoundaries: true,

        // Testing
        generateTests: true,
        testingLibrary: 'testing-library',
      },
    ],
  ],
};
```

## Features

### Responsive Design Implementation

- Mobile-first approach with responsive breakpoints
- Touch-friendly interactions for mobile devices
- Optimized layouts for different screen sizes
- Progressive enhancement patterns

### Accessibility (a11y) Integration

- ARIA labels and roles for screen readers
- Keyboard navigation support
- Color contrast compliance
- Focus management and visual indicators

### Performance Optimization

- Lazy loading for images and components
- Code splitting for optimal bundle sizes
- Memoization for expensive computations
- Efficient re-rendering patterns

### Error Handling

- Comprehensive error boundaries
- User-friendly error messages
- Retry mechanisms for failed operations
- Graceful degradation patterns

## Integration with Other Plugins

Works with the Auto Engineer ecosystem:

- **@auto-engineer/react-graphql-generator**: Implements generated component scaffolds
- **@auto-engineer/design-system-importer**: Uses imported design tokens and components
- **@auto-engineer/frontend-checks**: Validates implementations pass tests and type checking
- **@auto-engineer/information-architect**: Uses IA specifications for navigation and content structure

## Quality Assurance

Ensures high-quality implementations through:

- **TypeScript Compliance**: Full type safety and IntelliSense support
- **Component Testing**: Comprehensive test coverage for user interactions
- **Accessibility Auditing**: WCAG compliance and screen reader compatibility
- **Performance Monitoring**: Identifies and resolves performance bottlenecks
- **Code Review**: AI-powered review for best practices and patterns

## Advanced Features

### Context-Aware Implementation

The AI understands:

- Existing design patterns and component structure
- GraphQL schema and available operations
- Design system tokens and component props
- User experience requirements and workflows
- Performance considerations and optimization opportunities

### Progressive Implementation

- Implements core functionality first
- Adds advanced features incrementally
- Supports partial implementations and manual refinements
- Adapts to user feedback and requirements changes

The Frontend Implementation plugin transforms UI specifications and design requirements into functional React applications, accelerating frontend development while maintaining quality and consistency.
