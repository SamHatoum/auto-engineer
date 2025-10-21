import { describe, it, expect } from 'vitest';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageTemplate = fs.readFileSync(path.resolve(__dirname, 'page.ejs'), 'utf-8');

describe('page.ejs', () => {
  it('should generate a basic page with organisms and no type guidance', () => {
    const content = ejs.render(pageTemplate, {
      name: 'Dashboard',
      description: 'Main dashboard page',
      organisms: ['StatsOverview', 'ActivityFeed'],
      template: undefined,
      specs: [],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {},
    });

    expect(content).toContain('import { StatsOverview } from "@/components/organisms/StatsOverview";');
    expect(content).toContain('import { ActivityFeed } from "@/components/organisms/ActivityFeed";');
    expect(content).toContain('// Main dashboard page');
    expect(content).toContain('PAGE COMPOSITION');
    expect(content).toContain('export function Dashboard()');
  });

  it('should generate a page with organisms and specs', () => {
    const content = ejs.render(pageTemplate, {
      name: 'AdminPanel',
      description: 'Admin control panel',
      organisms: ['UserManagement', 'SystemSettings'],
      template: undefined,
      specs: ['manage users', 'configure system'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {},
    });

    expect(content).toContain('// Specs:');
    expect(content).toContain('// - manage users');
    expect(content).toContain('// - configure system');
    expect(content).toContain('PAGE COMPOSITION');
  });

  it('should generate a page with spec coverage analysis', () => {
    const content = ejs.render(pageTemplate, {
      name: 'UserProfile',
      description: 'User profile page',
      organisms: ['ProfileHeader', 'ProfileDetails'],
      template: undefined,
      specs: ['display user info', 'show activity history'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {
        ProfileHeader: ['display user info'],
        ProfileDetails: ['show activity history'],
      },
    });

    expect(content).toContain('YOUR SPECS (what this page must accomplish):');
    expect(content).toContain('[✓] display user info');
    expect(content).toContain('└─ Implemented by ProfileHeader');
    expect(content).toContain('[✓] show activity history');
    expect(content).toContain('└─ Implemented by ProfileDetails');
  });

  it('should generate a page with template import', () => {
    const content = ejs.render(pageTemplate, {
      name: 'Settings',
      description: 'Settings page',
      organisms: ['GeneralSettings'],
      template: 'single-column-layout',
      specs: [],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {},
    });

    expect(content).toContain('import { SingleColumnLayout } from "@/components/templates/single-column-layout";');
  });

  it('should generate a page with type guidance', () => {
    const content = ejs.render(pageTemplate, {
      name: 'TodoList',
      description: 'Todo list page',
      organisms: ['TodoGrid'],
      template: undefined,
      specs: ['display todos', 'filter by status'],
      typeGuidance: {
        imports: ['Todo', 'TodoStatus'],
        queryGuidance: [
          "Query - AllTodos:\n  Import: import { AllTodos } from '@/graphql/queries'\n  Returns: data?.todos → Todo[]",
        ],
        mutationGuidance: [],
        enumGuidance: [
          "Enum - TodoStatus:\n  Import: import { TodoStatus } from '@/gql/graphql'\n  Values:\n  TodoStatus.Active = 'ACTIVE'",
        ],
      },
      organismSpecs: {},
    });

    expect(content).toContain('CRITICAL - TYPE GUIDANCE');
    expect(content).toContain('Query - AllTodos:');
    expect(content).toContain('Enum - TodoStatus:');
  });

  it('should generate a page with partial spec coverage', () => {
    const content = ejs.render(pageTemplate, {
      name: 'TaskBoard',
      description: 'Task management board',
      organisms: ['TaskList', 'TaskFilters'],
      template: undefined,
      specs: ['display tasks', 'filter by status', 'sort by date', 'search tasks'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {
        TaskList: ['display tasks', 'sort by date'],
        TaskFilters: ['filter by status'],
      },
    });

    expect(content).toContain('[✓] display tasks');
    expect(content).toContain('└─ Implemented by TaskList');
    expect(content).toContain('[✓] filter by status');
    expect(content).toContain('└─ Implemented by TaskFilters');
    expect(content).toContain('[✓] sort by date');
    expect(content).toContain('└─ Implemented by TaskList');
    expect(content).toContain('[ ] search tasks');
    expect(content).not.toContain('search tasks\n//       └─');
  });

  it('should generate a page with NO spec coverage', () => {
    const content = ejs.render(pageTemplate, {
      name: 'Analytics',
      description: 'Analytics dashboard',
      organisms: ['ChartPanel', 'MetricsPanel'],
      template: undefined,
      specs: ['show revenue chart', 'display user metrics', 'export data'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {
        ChartPanel: ['render line chart', 'render bar chart'],
        MetricsPanel: ['show count metrics', 'show percentage metrics'],
      },
    });

    expect(content).toContain('[ ] show revenue chart');
    expect(content).toContain('[ ] display user metrics');
    expect(content).toContain('[ ] export data');
    expect(content).not.toContain('[✓]');
    expect(content).not.toContain('└─ Implemented by');
  });

  it('should generate a page with mutation guidance', () => {
    const content = ejs.render(pageTemplate, {
      name: 'CreateItem',
      description: 'Create item page',
      organisms: ['ItemForm'],
      template: undefined,
      specs: ['collect item data', 'submit item'],
      typeGuidance: {
        imports: ['CreateItemInput'],
        queryGuidance: [],
        mutationGuidance: [
          "Mutation - CreateItem:\n  Import: import { CreateItem } from '@/graphql/mutations'\n  Variables: CreateItemInput\n  Returns: data?.createItem → Item",
        ],
        enumGuidance: [],
      },
      organismSpecs: {},
    });

    expect(content).toContain('CRITICAL - TYPE GUIDANCE');
    expect(content).toContain('Mutation - CreateItem:');
    expect(content).toContain('Child organism data requirements');
  });

  it('should generate a page with only mutation guidance (no queries)', () => {
    const content = ejs.render(pageTemplate, {
      name: 'DeleteConfirmation',
      description: 'Delete confirmation page',
      organisms: ['ConfirmDialog'],
      template: undefined,
      specs: ['confirm deletion'],
      typeGuidance: {
        imports: [],
        queryGuidance: [],
        mutationGuidance: [
          "Mutation - DeleteItem:\n  Import: import { DeleteItem } from '@/graphql/mutations'\n  Variables: { itemId: string }",
        ],
        enumGuidance: [],
      },
      organismSpecs: {},
    });

    expect(content).toContain('CRITICAL - TYPE GUIDANCE');
    expect(content).toContain('Mutation - DeleteItem:');
    expect(content).not.toContain('Query -');
  });

  it('should generate a page with template and type guidance combined', () => {
    const content = ejs.render(pageTemplate, {
      name: 'ProductCatalog',
      description: 'Product catalog page',
      organisms: ['ProductGrid', 'ProductFilters'],
      template: 'two-column-layout',
      specs: ['display products', 'filter products'],
      typeGuidance: {
        imports: ['Product'],
        queryGuidance: [
          "Query - AllProducts:\n  Import: import { AllProducts } from '@/graphql/queries'\n  Returns: data?.products → Product[]",
        ],
        mutationGuidance: [],
        enumGuidance: [],
      },
      organismSpecs: {
        ProductGrid: ['display products'],
        ProductFilters: ['filter products'],
      },
    });

    expect(content).toContain('import { TwoColumnLayout } from "@/components/templates/two-column-layout";');
    expect(content).toContain('CRITICAL - TYPE GUIDANCE');
    expect(content).toContain('[✓] display products');
    expect(content).toContain('[✓] filter products');
  });

  it('should include responsive design guidance', () => {
    const content = ejs.render(pageTemplate, {
      name: 'SimpleList',
      description: 'Simple list page',
      organisms: ['ItemList'],
      template: undefined,
      specs: ['show items'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {},
    });

    expect(content).toContain('CRITICAL - CONTAINER-AWARE RESPONSIVE DESIGN:');
    expect(content).toContain('GRIDS: Always start mobile-first');
    expect(content).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    expect(content).toContain('TEXT SIZING: Use responsive classes');
    expect(content).toContain('MENTAL TEST: Would this work in a 320px wide container?');
  });

  it('should handle organisms without organismSpecs data', () => {
    const content = ejs.render(pageTemplate, {
      name: 'MixedPage',
      description: 'Page with documented and undocumented organisms',
      organisms: ['DocumentedOrg', 'UndocumentedOrg'],
      template: undefined,
      specs: ['feature A', 'feature B'],
      typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      organismSpecs: {
        DocumentedOrg: ['feature A'],
      },
    });

    expect(content).toContain('**DocumentedOrg** capabilities:');
    expect(content).toContain('• feature A');
    expect(content).toContain('**UndocumentedOrg**');
    expect(content).toContain('(Organism with specific purpose - compose as needed)');
  });

  describe('Edge Cases', () => {
    it('should handle empty organisms array', () => {
      const content = ejs.render(pageTemplate, {
        name: 'EmptyPage',
        description: 'Page without organisms',
        organisms: [],
        template: undefined,
        specs: [],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        organismSpecs: {},
      });

      expect(content).not.toContain('PAGE COMPOSITION');
      expect(content).not.toContain('Composition Rules');
      expect(content).toContain('export function EmptyPage()');
    });

    it('should handle undefined specs gracefully', () => {
      const content = ejs.render(pageTemplate, {
        name: 'NoSpecs',
        description: 'Page without specs',
        organisms: ['SomeOrganism'],
        template: undefined,
        specs: undefined,
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        organismSpecs: {},
      });

      expect(content).not.toContain('// Specs:');
      expect(content).not.toContain('YOUR SPECS');
      expect(content).toContain('PAGE COMPOSITION');
    });

    it('should handle organisms with empty organismSpecs arrays', () => {
      const content = ejs.render(pageTemplate, {
        name: 'EmptySpecs',
        description: 'Organisms with no documented specs',
        organisms: ['Org1', 'Org2'],
        template: undefined,
        specs: ['feature X', 'feature Y'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        organismSpecs: {
          Org1: [],
          Org2: [],
        },
      });

      expect(content).toContain('[ ] feature X');
      expect(content).toContain('[ ] feature Y');
      expect(content).not.toContain('[✓]');
    });
  });
});
