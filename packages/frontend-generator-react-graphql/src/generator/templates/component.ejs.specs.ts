import { describe, it, expect } from 'vitest';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentTemplate = fs.readFileSync(path.resolve(__dirname, 'component.ejs'), 'utf-8');

describe('component.ejs', () => {
  describe('Molecules', () => {
    it('should generate a basic molecule with atoms and no type guidance', () => {
      const content = ejs.render(componentTemplate, {
        name: 'TaskCard',
        description: 'Card displaying task information',
        atoms: ['Button', 'Badge'],
        molecules: [],
        specs: [],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      });

      expect(content).toContain('// 🎨 REQUIRED ATOM COMPONENTS:');
      expect(content).toContain('// Button, Badge');
      expect(content).toContain('// Card displaying task information');
      expect(content).toContain('export function TaskCard()');
      expect(content).not.toContain('IMPLEMENTATION GUIDE');
    });

    it('should generate a molecule with atoms and specs', () => {
      const content = ejs.render(componentTemplate, {
        name: 'UserProfile',
        description: 'User profile card with avatar and details',
        atoms: ['Avatar', 'Text', 'Button'],
        molecules: [],
        specs: [
          'display user avatar with fallback initials',
          'show user name and email',
          'provide edit button for authorized users',
        ],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      });

      expect(content).toContain('// Specs:');
      expect(content).toContain('// - display user avatar with fallback initials');
      expect(content).toContain('// - show user name and email');
      expect(content).toContain('export function UserProfile()');
    });

    it('should generate a molecule with empty atoms array', () => {
      const content = ejs.render(componentTemplate, {
        name: 'EmptyMolecule',
        description: 'Molecule with no atoms',
        atoms: [],
        molecules: [],
        specs: [],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      });

      expect(content).toContain('// Molecule with no atoms');
      expect(content).toContain('export function EmptyMolecule()');
      expect(content).not.toContain('🎨 REQUIRED ATOM COMPONENTS');
    });
  });

  describe('Organisms', () => {
    it('should generate a basic organism with molecules and no type guidance', () => {
      const content = ejs.render(componentTemplate, {
        name: 'TaskList',
        description: 'List of task cards with filtering',
        atoms: [],
        molecules: ['TaskCard', 'FilterBar'],
        specs: [],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {},
      });

      expect(content).toContain('import { TaskCard } from "@/components/molecules/TaskCard";');
      expect(content).toContain('import { FilterBar } from "@/components/molecules/FilterBar";');
      expect(content).toContain('// List of task cards with filtering');
      expect(content).toContain('IMPLEMENTATION GUIDE');
      expect(content).toContain('export function TaskList()');
    });

    it('should generate an organism with molecules and specs', () => {
      const content = ejs.render(componentTemplate, {
        name: 'CommentSection',
        description: 'Comment section with add/edit/delete functionality',
        atoms: [],
        molecules: ['CommentCard', 'CommentForm'],
        specs: [
          'display comments in chronological order',
          'allow users to add new comments',
          'allow users to edit their own comments',
          'allow users to delete their own comments',
        ],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {},
      });

      expect(content).toContain('// Specs:');
      expect(content).toContain('// - display comments in chronological order');
      expect(content).toContain('IMPLEMENTATION GUIDE');
      expect(content).toContain('export function CommentSection()');
    });

    it('should generate an organism with comprehensive molecule (all specs covered)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'StatisticsDashboard',
        description: 'Dashboard showing task statistics',
        atoms: [],
        molecules: ['ProgressRing', 'StatCard'],
        specs: ['show total tasks count', 'display completion percentage', 'show breakdown by status'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          StatCard: ['show total tasks count', 'display completion percentage', 'show breakdown by status'],
          ProgressRing: ['display circular progress'],
        },
      });

      expect(content).toContain('IMPLEMENTATION GUIDE');
      expect(content).toContain('Spec Coverage:');
      expect(content).toContain('[✓] show total tasks count ← StatCard');
      expect(content).toContain('[✓] display completion percentage ← StatCard');
      expect(content).toContain('[✓] show breakdown by status ← StatCard');
      expect(content).toContain('StatCard implements ALL ✓ specs');
      expect(content).toContain('ProgressRing: Helper component');
      expect(content).toContain('CRITICAL: NO grids/arrays for single comprehensive components');
      expect(content).toContain('//       <ProgressRing />');
      expect(content).toContain('//       <StatCard />');
    });

    it('should generate an organism with partial spec coverage', () => {
      const content = ejs.render(componentTemplate, {
        name: 'UserDashboard',
        description: 'Dashboard with user info',
        atoms: [],
        molecules: ['UserCard', 'ActivityFeed'],
        specs: ['display user profile', 'show recent activity', 'display settings button'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          UserCard: ['display user profile'],
          ActivityFeed: ['show recent activity'],
        },
      });

      expect(content).toContain('Spec Coverage:');
      expect(content).toContain('[✓] display user profile ← UserCard');
      expect(content).toContain('[✓] show recent activity ← ActivityFeed');
      expect(content).toContain('[ ] display settings button');
      expect(content).not.toContain('implements ALL ✓ specs');
      expect(content).toContain('UserCard: 1 capabilities');
      expect(content).toContain('ActivityFeed: 1 capabilities');
    });

    it('should generate an organism with full type guidance (queries, mutations, enums)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'TodoManager',
        description: 'Todo management with CRUD operations',
        atoms: [],
        molecules: ['TodoCard', 'TodoForm'],
        specs: ['manage todo items', 'support status transitions'],
        typeGuidance: {
          imports: [
            'TodoState',
            'TodoStateStatus',
            'MarkTodoInProgressMutationVariables',
            'MarkTodoCompleteMutationVariables',
          ],
          queryGuidance: [
            "Query - AllTodos:\n  Import: import { AllTodos } from '@/graphql/queries'\n  Returns: data?.todos → TodoState[]\n  Usage: const { data } = useQuery(AllTodos)",
          ],
          mutationGuidance: [
            "Mutation - MarkTodoInProgress:\n  Import: import { MarkTodoInProgress } from '@/graphql/mutations'\n  Variables: MarkTodoInProgressMutationVariables\n  Input: { todoId: string }\n  Usage: const [mutate] = useMutation(MarkTodoInProgress)\n  Call: mutate({ variables: { input: {...} } })",
          ],
          enumGuidance: [
            "Enum - TodoStateStatus:\n  Import: import { TodoStateStatus } from '@/gql/graphql'\n  Values:\n  TodoStateStatus.Pending = 'PENDING'\n  TodoStateStatus.InProgress = 'IN_PROGRESS'\n  TodoStateStatus.Completed = 'COMPLETED'",
          ],
        },
        moleculeSpecs: {},
      });

      expect(content).toContain('CRITICAL - TYPE GUIDANCE');
      expect(content).toContain('Query - AllTodos:');
      expect(content).toContain('Mutation - MarkTodoInProgress:');
      expect(content).toContain('Enum - TodoStateStatus:');
      expect(content).toContain('PROHIBITED PATTERNS');
      expect(content).toContain('MUTATION ERROR HANDLING PATTERN');
      expect(content).toContain('IMPLEMENTATION GUIDE');
    });

    it('should generate an organism with type field guidance', () => {
      const content = ejs.render(componentTemplate, {
        name: 'UserDashboard',
        description: 'Dashboard displaying user information',
        atoms: [],
        molecules: ['UserCard'],
        specs: ['display user details', 'show activity history'],
        typeGuidance: {
          imports: ['User'],
          queryGuidance: [
            "Query - GetUser:\n  Import: import { GetUser } from '@/graphql/queries'\n  Returns: data?.user → User\n  Usage: const { data } = useQuery(GetUser)",
          ],
          mutationGuidance: [],
          typeFieldGuidance: [
            'Type - User:\n  Fields: {\n    userId: string\n    name: string\n    email: string\n  }',
          ],
          enumGuidance: [],
        },
        moleculeSpecs: {},
      });

      expect(content).toContain('Type - User:');
      expect(content).toContain('Fields: {');
      expect(content).toContain('userId: string');
    });

    it('should generate an organism with NO spec coverage (molecules cover none)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'ShoppingCart',
        description: 'Shopping cart with items and checkout',
        atoms: [],
        molecules: ['CartItem', 'CheckoutButton'],
        specs: ['display cart total', 'allow quantity updates', 'show promo code input'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          CartItem: ['display item details', 'show item price'],
          CheckoutButton: ['handle checkout flow'],
        },
      });

      expect(content).toContain('Spec Coverage:');
      expect(content).toContain('[ ] display cart total');
      expect(content).toContain('[ ] allow quantity updates');
      expect(content).toContain('[ ] show promo code input');
      expect(content).not.toContain('implements ALL ✓ specs');
      expect(content).toContain('CartItem: 2 capabilities');
      expect(content).toContain('CheckoutButton: 1 capabilities');
    });

    it('should generate an organism with multiple comprehensive molecules', () => {
      const content = ejs.render(componentTemplate, {
        name: 'DualDashboard',
        description: 'Dashboard with two independent sections',
        atoms: [],
        molecules: ['LeftPanel', 'RightPanel'],
        specs: ['show user metrics', 'show system health'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          LeftPanel: ['show user metrics'],
          RightPanel: ['show system health'],
        },
      });

      expect(content).toContain('[✓] show user metrics ← LeftPanel');
      expect(content).toContain('[✓] show system health ← RightPanel');
      expect(content).not.toContain('implements ALL ✓ specs');
      expect(content).toContain('LeftPanel: 1 capabilities');
      expect(content).toContain('RightPanel: 1 capabilities');
    });

    it('should generate an organism with only mutation guidance (no queries)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'CreateItemForm',
        description: 'Form to create new item',
        atoms: [],
        molecules: ['FormField', 'SubmitButton'],
        specs: ['collect item data', 'submit to server'],
        typeGuidance: {
          imports: ['CreateItemMutationVariables'],
          queryGuidance: [],
          mutationGuidance: [
            "Mutation - CreateItem:\n  Import: import { CreateItem } from '@/graphql/mutations'\n  Variables: CreateItemMutationVariables\n  Usage: const [mutate] = useMutation(CreateItem)",
          ],
          enumGuidance: [],
        },
        moleculeSpecs: {},
      });

      expect(content).toContain('CRITICAL - TYPE GUIDANCE');
      expect(content).toContain('Mutation - CreateItem:');
      expect(content).toContain('MUTATION ERROR HANDLING PATTERN');
      expect(content).not.toContain('Query -');
    });

    it('should generate an organism with only enum guidance', () => {
      const content = ejs.render(componentTemplate, {
        name: 'PriorityFilter',
        description: 'Filter by priority level',
        atoms: [],
        molecules: ['Dropdown'],
        specs: ['allow priority selection'],
        typeGuidance: {
          imports: ['Priority'],
          queryGuidance: [],
          mutationGuidance: [],
          enumGuidance: [
            "Enum - Priority:\n  Import: import { Priority } from '@/gql/graphql'\n  Values:\n  Priority.High = 'HIGH'\n  Priority.Medium = 'MEDIUM'\n  Priority.Low = 'LOW'",
          ],
        },
        moleculeSpecs: {},
      });

      expect(content).toContain('CRITICAL - TYPE GUIDANCE');
      expect(content).toContain('Enum - Priority:');
      expect(content).not.toContain('Query -');
      expect(content).not.toContain('Mutation -');
      expect(content).not.toContain('MUTATION ERROR HANDLING');
    });

    it('should generate an organism with atoms AND molecules (mixed)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'SearchBar',
        description: 'Search bar with filters',
        atoms: ['Input', 'Button'],
        molecules: ['FilterPanel'],
        specs: ['accept search input', 'show filter options'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          FilterPanel: ['show filter options'],
        },
      });

      expect(content).toContain('// 🎨 REQUIRED ATOM COMPONENTS:');
      expect(content).toContain('// Input, Button');
      expect(content).toContain('import { FilterPanel } from "@/components/molecules/FilterPanel";');
      expect(content).toContain('IMPLEMENTATION GUIDE');
      expect(content).toContain('[✓] show filter options ← FilterPanel');
      expect(content).toContain('[ ] accept search input');
    });

    it('should generate an organism with empty moleculeSpecs for some molecules', () => {
      const content = ejs.render(componentTemplate, {
        name: 'MixedPanel',
        description: 'Panel with documented and undocumented molecules',
        atoms: [],
        molecules: ['DocumentedCard', 'UndocumentedCard'],
        specs: ['show data', 'allow interactions'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          DocumentedCard: ['show data'],
        },
      });

      expect(content).toContain('[✓] show data ← DocumentedCard');
      expect(content).toContain('[ ] allow interactions');
      expect(content).toContain('DocumentedCard: 1 capabilities');
      expect(content).toContain('UndocumentedCard: 0 capabilities');
    });

    it('should handle organism with specs but molecules have empty arrays in moleculeSpecs', () => {
      const content = ejs.render(componentTemplate, {
        name: 'EmptySpecPanel',
        description: 'Panel where molecules have no documented specs',
        atoms: [],
        molecules: ['Card1', 'Card2'],
        specs: ['display content', 'handle clicks'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          Card1: [],
          Card2: [],
        },
      });

      expect(content).toContain('[ ] display content');
      expect(content).toContain('[ ] handle clicks');
      expect(content).toContain('Card1: 0 capabilities');
      expect(content).toContain('Card2: 0 capabilities');
    });

    it('should generate molecule with type guidance (molecules can have GraphQL)', () => {
      const content = ejs.render(componentTemplate, {
        name: 'UserCard',
        description: 'Card showing user information',
        atoms: ['Avatar', 'Text'],
        molecules: [],
        specs: ['display user name', 'show user avatar'],
        typeGuidance: {
          imports: ['User'],
          queryGuidance: [
            "Query - GetCurrentUser:\n  Import: import { GetCurrentUser } from '@/graphql/queries'\n  Returns: data?.currentUser → User",
          ],
          mutationGuidance: [],
          enumGuidance: [],
        },
      });

      expect(content).toContain('CRITICAL - TYPE GUIDANCE');
      expect(content).toContain('Query - GetCurrentUser:');
      expect(content).not.toContain('IMPLEMENTATION GUIDE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined specs gracefully', () => {
      const content = ejs.render(componentTemplate, {
        name: 'NoSpecs',
        description: 'Component without specs',
        atoms: [],
        molecules: ['Helper'],
        specs: undefined,
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {},
      });

      expect(content).toContain('IMPLEMENTATION GUIDE');
      expect(content).not.toContain('Spec Coverage:');
      expect(content).toContain('export function NoSpecs()');
    });

    it('should handle empty arrays vs undefined consistently', () => {
      const content = ejs.render(componentTemplate, {
        name: 'Consistent',
        description: 'Test consistency',
        atoms: [],
        molecules: [],
        specs: [],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
      });

      expect(content).not.toContain('IMPLEMENTATION GUIDE');
      expect(content).toContain('export function Consistent()');
    });

    it('should handle organism with single comprehensive molecule and helper', () => {
      const content = ejs.render(componentTemplate, {
        name: 'ProfilePage',
        description: 'User profile page',
        atoms: [],
        molecules: ['ProfileCard', 'EditButton'],
        specs: ['show user profile', 'show user stats', 'allow editing'],
        typeGuidance: { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] },
        moleculeSpecs: {
          ProfileCard: ['show user profile', 'show user stats'],
          EditButton: [],
        },
      });

      expect(content).toContain('[✓] show user profile ← ProfileCard');
      expect(content).toContain('[✓] show user stats ← ProfileCard');
      expect(content).toContain('[ ] allow editing');
      expect(content).not.toContain('implements ALL ✓ specs');
      expect(content).toContain('ProfileCard: 2 capabilities');
      expect(content).toContain('EditButton: 0 capabilities');
    });
  });
});
