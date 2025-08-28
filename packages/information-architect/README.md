# @auto-engineer/information-architect

AI-powered information architecture generation plugin for the Auto Engineer CLI that transforms business requirements into structured application blueprints. This plugin creates information architectures, user experience flows, and content hierarchies from high-level requirements.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/information-architect
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/information-architect',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `generate:ia` - Generate information architecture from requirements

## What does this plugin do?

The Information Architect plugin analyzes business requirements and generates structured information architectures that serve as blueprints for application development. It creates user experience flows, content hierarchies, navigation structures, and interaction patterns that guide the development of frontend and backend systems.

## Key Features

### Requirements Analysis

- Parses business requirements
- Identifies user personas and use cases
- Extracts functional and non-functional requirements
- Maps business processes to application features

### Information Architecture Generation

- Creates content structures
- Defines navigation patterns and user flows
- Establishes data relationships and dependencies
- Generates wireframes and interaction specifications

### User Experience Design

- Maps user journeys and task flows
- Identifies key interaction points and decision moments
- Defines responsive design requirements
- Creates accessibility and usability guidelines

### Technical Specifications

- Generates API requirements and data models
- Creates component hierarchies for frontend development
- Defines integration points and external dependencies
- Establishes performance and scalability requirements

## Generated Architecture Components

### Site Map and Navigation

Creates comprehensive navigation structures:

```json
{
  "siteMap": {
    "root": "/",
    "sections": [
      {
        "name": "Dashboard",
        "path": "/dashboard",
        "access": "authenticated",
        "children": [
          {
            "name": "Analytics",
            "path": "/dashboard/analytics",
            "description": "Performance metrics and insights"
          },
          {
            "name": "Settings",
            "path": "/dashboard/settings",
            "description": "Account and application settings"
          }
        ]
      },
      {
        "name": "Products",
        "path": "/products",
        "access": "public",
        "children": [
          {
            "name": "Catalog",
            "path": "/products/catalog",
            "description": "Browse all available products"
          },
          {
            "name": "Product Details",
            "path": "/products/:id",
            "description": "Detailed product information and purchasing options"
          }
        ]
      }
    ]
  }
}
```

### User Personas and Journeys

Defines target users and their interaction patterns:

```json
{
  "personas": [
    {
      "name": "End Consumer",
      "description": "Individual purchasing products for personal use",
      "goals": ["Find products quickly", "Compare options easily", "Complete purchases securely"],
      "painPoints": ["Complex checkout process", "Limited product information", "Poor mobile experience"],
      "journeys": [
        {
          "name": "Product Purchase",
          "steps": [
            {
              "stage": "Discovery",
              "actions": ["Browse catalog", "Search products", "Filter results"],
              "touchpoints": ["/products", "/search"],
              "requirements": ["Fast search", "Intuitive filters", "Product recommendations"]
            },
            {
              "stage": "Evaluation",
              "actions": ["View details", "Compare products", "Read reviews"],
              "touchpoints": ["/products/:id", "/compare"],
              "requirements": ["Detailed information", "High-quality images", "Social proof"]
            },
            {
              "stage": "Purchase",
              "actions": ["Add to cart", "Checkout", "Payment"],
              "touchpoints": ["/cart", "/checkout"],
              "requirements": ["Simple checkout", "Multiple payment options", "Security indicators"]
            }
          ]
        }
      ]
    }
  ]
}
```

### Page Specifications

Detailed specifications for each application page:

```json
{
  "pages": [
    {
      "name": "Product Catalog",
      "path": "/products",
      "purpose": "Allow users to browse and discover products",
      "layout": {
        "type": "grid",
        "responsive": true,
        "components": [
          {
            "name": "SearchBar",
            "position": "header",
            "functionality": "Real-time product search with autocomplete"
          },
          {
            "name": "FilterSidebar",
            "position": "left",
            "functionality": "Category, price, and attribute filtering"
          },
          {
            "name": "ProductGrid",
            "position": "main",
            "functionality": "Paginated grid of product cards with sorting options"
          },
          {
            "name": "Pagination",
            "position": "footer",
            "functionality": "Navigate through product results"
          }
        ]
      },
      "dataRequirements": [
        "Product catalog with metadata",
        "Category hierarchy",
        "Search indexing",
        "User preferences"
      ],
      "apiEndpoints": ["GET /api/products", "GET /api/categories", "GET /api/search"]
    }
  ]
}
```

### Component Architecture

Defines reusable component specifications:

```json
{
  "components": [
    {
      "name": "ProductCard",
      "type": "organism",
      "purpose": "Display product information in a card format",
      "props": [
        {
          "name": "product",
          "type": "Product",
          "required": true,
          "description": "Product data object"
        },
        {
          "name": "onAddToCart",
          "type": "function",
          "required": false,
          "description": "Callback when add to cart is clicked"
        }
      ],
      "composition": ["ProductImage", "ProductTitle", "ProductPrice", "AddToCartButton", "ProductRating"],
      "states": ["loading", "outOfStock", "onSale"],
      "interactions": [
        "hover: show quick actions",
        "click: navigate to product details",
        "cart button: add to cart with feedback"
      ]
    }
  ]
}
```

### Data Models and Relationships

Defines backend data structure requirements:

```json
{
  "dataModels": [
    {
      "name": "Product",
      "description": "Core product entity",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "description": "Unique product identifier"
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "description": "Product display name"
        },
        {
          "name": "price",
          "type": "decimal",
          "required": true,
          "description": "Product price in base currency"
        },
        {
          "name": "category",
          "type": "Category",
          "required": true,
          "relationship": "many-to-one"
        }
      ],
      "relationships": [
        {
          "type": "one-to-many",
          "target": "Review",
          "description": "Products can have multiple reviews"
        },
        {
          "type": "many-to-many",
          "target": "Tag",
          "description": "Products can have multiple tags for categorization"
        }
      ]
    }
  ]
}
```

## Configuration Options

Customize IA generation behavior:

```typescript
// auto.config.ts
export default {
  plugins: [
    [
      '@auto-engineer/information-architect',
      {
        // Analysis preferences
        includeUserPersonas: true,
        includeUserJourneys: true,
        includeWireframes: false,

        // Output format
        outputFormat: 'json', // or 'markdown', 'html'

        // Detail level
        detailLevel: 'comprehensive', // or 'basic', 'detailed'

        // Target platforms
        platforms: ['web', 'mobile'],

        // Design system integration
        useDesignSystem: true,
        designSystemPath: './design-system',
      },
    ],
  ],
};
```

## Integration with Other Plugins

The Information Architect serves as a foundation for other plugins:

- **@auto-engineer/flowlang**: Uses IA specifications to generate business flows
- **@auto-engineer/emmett-generator**: Creates backend models from IA data specifications
- **@auto-engineer/react-graphql-generator**: Generates frontend structure based on IA navigation
- **@auto-engineer/design-system-importer**: Applies design system constraints to IA components
- **@auto-engineer/frontend-implementation**: Implements pages and components per IA specifications

## Workflow

### 1. Requirements Input

Provide business requirements as natural language:

```bash
auto generate:ia --requirements="Create an e-commerce platform for selling handmade crafts. Users should be able to browse products, add items to cart, and complete purchases. Include user accounts, order history, and seller management."
```

### 2. IA Generation

The plugin analyzes requirements and generates:

- Complete site map and navigation structure
- User personas and journey maps
- Page specifications with component breakdowns
- Data model requirements
- API endpoint specifications
- Technical requirements and constraints

### 3. Architecture Review

Generated architecture includes:

- Visual site map diagrams
- User flow documentation
- Component hierarchy specifications
- Database schema recommendations
- Integration requirements

### 4. Development Guidance

The IA serves as input for subsequent development phases:

- Frontend scaffolding follows navigation structure
- Backend models implement data specifications
- Component implementations follow IA component specs
- User testing validates against defined user journeys

## Quality Assurance

The plugin ensures architecture through:

- Requirements Coverage: All stated requirements are addressed in the IA
- User Experience Validation: Generated flows support identified user goals
- Technical Feasibility: Architecture recommendations are technically sound
- Scalability Considerations: Structure supports growth and feature expansion
- Accessibility Standards: IA includes accessibility requirements and guidelines

## Advanced Features

### Iterative Refinement

- Analyzes feedback and refines architecture
- Supports incremental requirement additions
- Maintains architecture consistency across changes
- Tracks requirement evolution and impact

### Multi-Platform Support

- Generates platform-specific considerations
- Addresses responsive design requirements
- Includes mobile-first considerations
- Plans for progressive web app features

The Information Architect plugin transforms high-level business requirements into actionable development blueprints, ensuring that applications are built with clear structure, user experience, and technical soundness from the start.
