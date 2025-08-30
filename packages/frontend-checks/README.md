# @auto-engineer/frontend-checks

Frontend validation and quality assurance plugin for the Auto Engineer CLI. This plugin provides testing and validation for React applications, ensuring code quality, performance, and user experience standards are met.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/frontend-checks
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/frontend-checks',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `check:client` - Check the client code for issues

## What does this plugin do?

The Frontend Checks plugin performs validation of React applications, including unit testing, integration testing, accessibility auditing, performance analysis, and code quality checks. It ensures that frontend applications meet standards.

## Key Features

### Testing

- Unit Testing: Component-level testing with React Testing Library
- Integration Testing: Page and feature-level testing
- End-to-End Testing: User workflow validation with Playwright
- Visual Regression Testing: UI consistency checks across changes

### Code Quality Assurance

- TypeScript Validation: Type safety and compilation checks
- ESLint Analysis: Code style and best practice enforcement
- Bundle Analysis: Performance and size optimization checks
- Accessibility Auditing: WCAG compliance and a11y best practices

### Performance Monitoring

- Lighthouse Audits: Performance, accessibility, and SEO scoring
- Core Web Vitals: Loading, interactivity, and visual stability metrics
- Bundle Size Analysis: JavaScript and CSS optimization recommendations
- Runtime Performance: Memory usage and rendering optimization

### User Experience Validation

- Responsive Design Testing: Multi-device and screen size compatibility
- Cross-Browser Testing: Compatibility across different browsers
- Accessibility Testing: Screen reader and keyboard navigation support
- Usability Heuristics: User interface and interaction pattern validation

## Testing Infrastructure

### Unit and Component Testing

Validates individual components and hooks:

```typescript
// Example test that would be run by the checker
describe('ProductCard Component', () => {
  it('renders product information correctly', () => {
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      price: 29.99,
      imageUrl: '/test-image.jpg'
    };

    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test-image.jpg');
  });

  it('handles add to cart interaction', async () => {
    const mockOnAddToCart = vi.fn();
    const mockProduct = createMockProduct();

    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const addButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addButton);

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

### Integration Testing

Tests complete user workflows:

```typescript
// Example integration test
describe('Product Purchase Flow', () => {
  it('allows user to complete a purchase', async () => {
    // Mock GraphQL responses
    const mocks = [
      createProductListMock(),
      createAddToCartMock(),
      createCheckoutMock()
    ];

    render(
      <MockedProvider mocks={mocks}>
        <App />
      </MockedProvider>
    );

    // Navigate to products
    await user.click(screen.getByText('Products'));

    // Add product to cart
    const addButton = await screen.findByText('Add to Cart');
    await user.click(addButton);

    // Proceed to checkout
    await user.click(screen.getByText('Checkout'));

    // Complete purchase
    await user.click(screen.getByText('Complete Order'));

    // Verify success
    expect(await screen.findByText('Order Confirmed')).toBeInTheDocument();
  });
});
```

### End-to-End Testing

Full application testing with Playwright:

```typescript
// Example E2E test
test('complete user registration and login flow', async ({ page }) => {
  await page.goto('/register');

  // Fill registration form
  await page.fill('[data-testid=name-input]', 'John Doe');
  await page.fill('[data-testid=email-input]', 'john@example.com');
  await page.fill('[data-testid=password-input]', 'securepassword');

  // Submit registration
  await page.click('[data-testid=register-button]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');

  // Verify welcome message
  await expect(page.locator('[data-testid=welcome-message]')).toContainText('Welcome, John');
});
```

## Quality Checks

### Accessibility Auditing

A11y validation:

- ARIA Compliance: ARIA labels, roles, and properties
- Keyboard Navigation: Tab order and keyboard accessibility
- Screen Reader Support: Semantic HTML and assistive technology compatibility
- Color Contrast: WCAG AA/AAA contrast ratio compliance
- Focus Management: Focus indicators and logical focus flow

### Performance Analysis

Performance metrics:

- Core Web Vitals:
  - Largest Contentful Paint (LCP) < 2.5s
  - First Input Delay (FID) < 100ms
  - Cumulative Layout Shift (CLS) < 0.1
- Bundle Size: JavaScript and CSS optimization recommendations
- Runtime Performance: Component re-render optimization
- Network Efficiency: Resource loading and caching strategies

### Code Quality Standards

Best practices:

- TypeScript: Type checking and compilation
- ESLint: Code style, React hooks rules, accessibility rules
- Prettier: Code formatting
- Import Organization: Import structure and unused import detection
- Component Architecture: Props validation and component composition patterns

## Configuration Options

Customize checking behavior:

```typescript
// auto.config.ts
export default {
  plugins: [
    [
      '@auto-engineer/frontend-checks',
      {
        // Testing configuration
        testTimeout: 10000,
        testCoverage: 80,
        runE2ETests: true,

        // Performance thresholds
        performanceThresholds: {
          lcp: 2500,
          fid: 100,
          cls: 0.1,
          bundleSize: 1024 * 1024, // 1MB
        },

        // Accessibility standards
        accessibilityLevel: 'WCAG_AA',

        // Browser testing
        browsers: ['chromium', 'firefox', 'safari'],

        // Device testing
        devices: ['Desktop', 'Mobile Chrome', 'Mobile Safari'],
      },
    ],
  ],
};
```

## Check Results and Reporting

### Test Results

Test reporting:

```bash
Frontend Checks Results
=======================

✅ Unit Tests: 45/45 passed (100%)
✅ Integration Tests: 12/12 passed (100%)
✅ E2E Tests: 8/8 passed (100%)

✅ TypeScript: No errors
✅ ESLint: No issues found
⚠️  Bundle Size: 1.2MB (exceeds 1MB threshold)

✅ Accessibility: WCAG AA compliant
✅ Performance: All Core Web Vitals passed
  - LCP: 1.8s ✅
  - FID: 45ms ✅
  - CLS: 0.05 ✅

Cross-Browser Results:
✅ Chrome: All tests passed
✅ Firefox: All tests passed
✅ Safari: All tests passed
```

### Detailed Reports

Generate reports:

- HTML Test Reports: Interactive test results with screenshots
- Coverage Reports: Line-by-line code coverage analysis
- Performance Reports: Lighthouse audit results and recommendations
- Accessibility Reports: A11y violation reports with remediation guidance
- Bundle Analysis: Visual bundle composition and optimization suggestions

## Integration with CI/CD

The frontend checks integrate with continuous integration:

```bash
# Run all frontend checks
auto check:client

# Exit codes:
# 0 - All checks passed
# 1 - Some checks failed
# 2 - Critical failures (build errors, etc.)
```

### GitHub Actions Integration

```yaml
name: Frontend Quality Checks
on: [push, pull_request]

jobs:
  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run frontend checks
        run: auto check:client

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

## Integration with Other Plugins

Works with the Auto Engineer ecosystem:

- @auto-engineer/frontend-generator-react-graphql: Validates generated React applications
- @auto-engineer/frontend-implementer: Checks AI-implemented code quality
- @auto-engineer/design-system-importer: Validates design system usage consistency
- @auto-engineer/information-architect: Validates implementation against IA specifications

## Advanced Features

### Custom Test Patterns

Define project-specific testing patterns:

```typescript
// Custom test utilities
export const createTestUtils = () => ({
  renderWithProviders: (component: React.ReactElement) => {
    return render(
      <MockedProvider>
        <BrowserRouter>
          <ThemeProvider>
            {component}
          </ThemeProvider>
        </BrowserRouter>
      </MockedProvider>
    );
  },

  mockGraphQLOperation: (operation: string, variables: any, result: any) => ({
    request: { query: operation, variables },
    result: { data: result }
  })
});
```

### Visual Regression Testing

Automated UI consistency validation:

- Screenshot Comparison: UI change detection
- Component Visual Tests: Component appearance validation
- Cross-Browser Visual Consistency: UI consistency across browsers
- Responsive Design Validation: Layout consistency across screen sizes

The Frontend Checks plugin ensures that React applications meet standards of quality, performance, accessibility, and user experience, providing confidence in production deployments.
