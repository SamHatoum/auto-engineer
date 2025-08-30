# @auto-engineer/frontend-generator-react-graphql

React client generation plugin for the Auto Engineer CLI that scaffolds GraphQL-powered frontend applications. This plugin creates type-safe React applications with tooling, design systems, and GraphQL integration.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/frontend-generator-react-graphql
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/frontend-generator-react-graphql',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `generate:client` - Generate a React GraphQL client application
- `copy:example` - Copy an example React GraphQL project template

## What does this plugin do?

The React GraphQL Generator creates React applications with GraphQL integration. It generates project scaffolding, configures build tools, sets up design systems, and creates type-safe GraphQL operations.

## Key Features

### Project Scaffolding

- React project structure with TypeScript
- Vite configuration for development and builds
- ESLint and Prettier setup for code quality
- Testing infrastructure with Vitest and Testing Library

### GraphQL Integration

- Apollo Client setup with type-safe operations
- Code generation from GraphQL schemas
- Optimistic updates and error handling patterns
- Real-time subscriptions and caching strategies

### Design System Support

- Design system options (Material-UI, shadcn/ui)
- Theming and styling patterns
- Responsive design with CSS techniques
- Component library integration and customization

### Developer Experience

- Hot module replacement for feedback
- TypeScript for compile-time safety
- IntelliSense and autocomplete support
- Development tools and debugging

## Available Starter Templates

### shadcn/ui Starter

React application using shadcn/ui components:

```bash
auto copy:example --template=shadcn
```

Features:

- shadcn/ui: Accessible components built with Radix UI
- Tailwind CSS: Utility-first CSS framework
- Apollo Client: GraphQL client with caching and state management
- React Router: Client-side routing with type safety
- Form Handling: React Hook Form with Zod validation
- Toast Notifications: User feedback with react-hot-toast

Project structure:

```
client/
├── src/
│   ├── components/
│   │   ├── atoms/           # shadcn/ui components
│   │   ├── molecules/       # Composed components
│   │   └── organisms/       # Complex UI sections
│   ├── pages/               # Application pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and configuration
│   ├── graphql/             # Generated GraphQL operations
│   └── styles/              # Global styles and theme
├── public/                  # Static assets
└── package.json
```

### Material-UI Starter

React application using Material-UI:

```bash
auto copy:example --template=mui
```

Features:

- Material-UI (MUI): React components implementing Google's Material Design
- Emotion: CSS-in-JS library for styling
- Apollo Client: GraphQL integration with Material-UI components
- React Router: Navigation with Material-UI integration
- Theme Customization: Theming system
- Responsive Design: Mobile-first approach with breakpoints

## Generated Application Features

### Type-Safe GraphQL Operations

The generator creates fully typed GraphQL operations:

```typescript
// Generated types from GraphQL schema
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Generated Apollo hooks
export const useGetUsersQuery = () => {
  return useQuery<GetUsersQuery, GetUsersQueryVariables>(GET_USERS);
};

export const useCreateUserMutation = () => {
  return useMutation<CreateUserMutation, CreateUserMutationVariables>(CREATE_USER);
};
```

### Component Architecture

Organized component structure following atomic design principles:

```typescript
// Atoms - Basic building blocks
export function Button({ children, variant, ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

// Molecules - Combined atoms
export function SearchBox({ onSearch, placeholder }: SearchBoxProps) {
  return (
    <div className="flex gap-2">
      <Input placeholder={placeholder} />
      <Button onClick={onSearch}>Search</Button>
    </div>
  );
}

// Organisms - Complex UI sections
export function UserList({ users, onUserSelect }: UserListProps) {
  return (
    <div className="space-y-4">
      <SearchBox onSearch={handleSearch} />
      <div className="grid gap-4">
        {users.map(user => (
          <UserCard key={user.id} user={user} onClick={onUserSelect} />
        ))}
      </div>
    </div>
  );
}
```

### Page Components

Complete page implementations with routing:

```typescript
export function UsersPage() {
  const { data, loading, error } = useGetUsersQuery();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() =>
    data?.users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [],
    [data?.users, searchTerm]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;

  return (
    <PageLayout title="Users" breadcrumbs={[{ label: 'Users', href: '/users' }]}>
      <UserList
        users={filteredUsers}
        onUserSelect={handleUserSelect}
      />
    </PageLayout>
  );
}
```

## Build Configuration

### Vite Setup

Build configuration with:

- Fast HMR for development
- Production builds
- Code splitting and lazy loading
- Environment variable handling
- Asset optimization

### GraphQL Code Generation

Type generation from GraphQL schemas:

```typescript
// codegen.ts configuration
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
      },
    },
  },
};
```

## Configuration Options

Customize generation through `auto.config.ts`:

```typescript
export default {
  plugins: [
    [
      '@auto-engineer/frontend-generator-react-graphql',
      {
        // Template selection
        template: 'shadcn', // or 'mui'

        // Build configuration
        bundler: 'vite',

        // GraphQL configuration
        graphqlEndpoint: 'http://localhost:4000/graphql',
        generateMocks: true,

        // Styling approach
        cssFramework: 'tailwind', // or 'emotion'

        // Additional features
        includeStorybook: true,
        includePWA: false,
        includeI18n: false,
      },
    ],
  ],
};
```

## Integration with Other Plugins

Works with the Auto Engineer ecosystem:

- **@auto-engineer/server-generator-apollo-emmett**: Consumes GraphQL schemas from generated servers
- **@auto-engineer/design-system-importer**: Integrates imported design tokens and components
- **@auto-engineer/frontend-implementer**: Provides scaffolding for AI-powered implementation
- **@auto-engineer/frontend-checks**: Validates generated applications
- **@auto-engineer/information-architect**: Uses IA specifications for navigation structure

## Development Workflow

1. **Generate Client Application**:

   ```bash
   auto generate:client
   ```

2. **Start Development Server**:

   ```bash
   cd client
   npm run start
   ```

3. **Generate GraphQL Types** (when schema changes):

   ```bash
   npm run codegen
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Testing Infrastructure

Generated applications include testing setup:

- Unit Testing: Vitest with React Testing Library
- Component Testing: Isolated component testing
- Integration Testing: Page-level testing with mocked GraphQL
- E2E Testing: Playwright configuration for end-to-end tests

Example test:

```typescript
describe('UserList Component', () => {
  it('renders users correctly', async () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com' }
    ];

    render(
      <MockedProvider mocks={[getUsersMock(mockUsers)]}>
        <UserList />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

Generated applications include:

- Code Splitting: Route-based and component-based splitting
- Lazy Loading: Images and non-critical components
- Bundle Analysis: Tools to analyze and optimize bundle size
- Caching Strategies: Apollo Client caching and persistence
- Optimization: Production build optimizations

The React GraphQL Generator provides a foundation for building React applications with GraphQL, allowing developers to focus on business logic rather than configuration and setup.
