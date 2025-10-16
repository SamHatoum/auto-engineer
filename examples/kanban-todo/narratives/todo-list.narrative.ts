import {
  command,
  data,
  example,
  narrative,
  gql,
  query,
  rule,
  should,
  sink,
  source,
  specs,
} from '@auto-engineer/narrative';
import type { Command, Event, State } from '@auto-engineer/narrative';

type AddTodo = Command<
  'AddTodo',
  {
    todoId: string;
    description: string;
  }
>;

type MarkTodoComplete = Command<
  'MarkTodoComplete',
  {
    todoId: string;
  }
>;

type MarkTodoInProgress = Command<
  'MarkTodoInProgress',
  {
    todoId: string;
  }
>;

type TodoAdded = Event<
  'TodoAdded',
  {
    todoId: string;
    description: string;
    status: 'pending';
    addedAt: Date;
  }
>;

type TodoListSummary = State<
  'TodoListSummary',
  {
    summaryId: string;
    totalTodos: number;
    pendingCount: number;
    inProgressCount: number;
    completedCount: number;
    completionPercentage: number;
  }
>;

type TodoMarkedComplete = Event<
  'TodoMarkedComplete',
  {
    todoId: string;
    completedAt: Date;
  }
>;

type TodoMarkedInProgress = Event<
  'TodoMarkedInProgress',
  {
    todoId: string;
    markedAt: Date;
  }
>;

type TodoState = State<
  'TodoState',
  {
    todoId: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    addedAt: Date;
    completedAt: Date | null;
  }
>;

narrative('Todo List', 'AUTO-T8dL3k9Xw', () => {
  command('adds a new todo', 'AUTO-A1c4Mn7Bz')
    .client(() => {
      specs('Add Todo', () => {
        should('display a quick-add input field with floating action button');
        should('show success animation when todo is added');
        should('automatically place new todo in "To Do" column');
        should('clear input field after successful addition');
        should('focus back to input for quick consecutive additions');
      });
    })
    .request(
      gql(`mutation AddTodo($input: AddTodoInput!) {
  addTodo(input: $input) {
    success
    error {
      type
      message
    }
  }
}`),
    )
    .server(() => {
      data([sink().event('TodoAdded').toStream('todos')]);
      specs(() => {
        rule('todos can be added to the list', 'AUTO-r1B2Cp8Y', () => {
          example('adds a new todo successfully')
            .when<AddTodo>({ todoId: 'todo-001', description: 'Buy groceries' })
            .then<TodoAdded>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            });
        });
      });
    });
  command('moves todo to in progress', 'AUTO-M2d5No8Cz')
    .client(() => {
      specs('Move to In Progress', () => {
        should('support drag-and-drop from "To Do" to "In Progress" column');
        should('animate smooth transition between columns');
        should('update column count badges in real-time');
        should('show visual feedback during drag operation');
      });
    })
    .request(
      gql(`mutation MarkTodoInProgress($input: MarkTodoInProgressInput!) {
  markTodoInProgress(input: $input) {
    success
    error {
      type
      message
    }
  }
}`),
    )
    .server(() => {
      data([sink().event('TodoMarkedInProgress').toStream('todos')]);
      specs(() => {
        rule('todos can be moved to in progress', 'AUTO-r2C3Dq9Z', () => {
          example('moves a pending todo to in progress')
            .given<TodoAdded>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .when<MarkTodoInProgress>({ todoId: 'todo-001' })
            .then<TodoMarkedInProgress>({ todoId: 'todo-001', markedAt: new Date('2030-01-01T10:00:00.000Z') });
        });
      });
    });
  command('marks todo as complete', 'AUTO-C3e6Op9Dz')
    .client(() => {
      specs('Complete Todo', () => {
        should('support drag-and-drop to "Done" column');
        should('show celebration animation on completion');
        should('display visual confetti effect for milestone completions');
        should('update completion percentage progress ring');
        should('strike-through completed todo text with smooth animation');
        should('show completion timestamp on hover');
      });
    })
    .request(
      gql(`mutation MarkTodoComplete($input: MarkTodoCompleteInput!) {
  markTodoComplete(input: $input) {
    success
    error {
      type
      message
    }
  }
}`),
    )
    .server(() => {
      data([sink().event('TodoMarkedComplete').toStream('todos')]);
      specs(() => {
        rule('todos can be marked as complete', 'AUTO-r3D4Eq0A', () => {
          example('marks an in-progress todo as complete')
            .given<TodoAdded>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .and<TodoMarkedInProgress>({ todoId: 'todo-001', markedAt: new Date('2030-01-01T10:00:00.000Z') })
            .when<MarkTodoComplete>({ todoId: 'todo-001' })
            .then<TodoMarkedComplete>({ todoId: 'todo-001', completedAt: new Date('2030-01-01T11:00:00.000Z') });
          example('marks a pending todo directly as complete')
            .given<TodoAdded>({
              todoId: 'todo-002',
              description: 'Write report',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .when<MarkTodoComplete>({ todoId: 'todo-002' })
            .then<TodoMarkedComplete>({ todoId: 'todo-002', completedAt: new Date('2030-01-01T11:30:00.000Z') });
        });
      });
    });
  query('views all todos', 'AUTO-V4f7Pq0Ez')
    .client(() => {
      specs('Todo List View', () => {
        should('display todos organized in three columns: To Do, In Progress, Done');
        should('show count badges on each column header');
        should('support drag-and-drop between columns');
        should('display empty state illustrations for empty columns');
        should('show todo cards with glass morphism effect');
        should('display subtle hover effects on todo cards');
        should('support keyboard navigation between todos');
      });
    })
    .request(
      gql(`query AllTodos {
  todos {
    todoId
    description
    status
    addedAt
    completedAt
  }
}`),
    )
    .server(() => {
      data([source().state('TodoState').fromProjection('Todos', 'todoId')]);
      specs(() => {
        rule('all todos are displayed with their current status', 'AUTO-r4E5Fr1B', () => {
          example('shows multiple todos in different states')
            .given<TodoAdded>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .and<TodoAdded>({
              todoId: 'todo-002',
              description: 'Write report',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:10:00.000Z'),
            })
            .and<TodoMarkedInProgress>({ todoId: 'todo-001', markedAt: new Date('2030-01-01T10:00:00.000Z') })
            .and<TodoMarkedComplete>({ todoId: 'todo-002', completedAt: new Date('2030-01-01T11:00:00.000Z') })
            .then<TodoState>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'in_progress',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
              completedAt: null,
            });
        });
      });
    });
  query('views completion summary', 'AUTO-S5g8Qr1Fz')
    .client(() => {
      specs('Completion Summary', () => {
        should('display circular progress ring showing completion percentage');
        should('show total task count in center of progress ring');
        should('display breakdown of pending, in-progress, and completed counts');
        should('update progress ring with smooth animation on status changes');
        should('use gradient colors for progress ring');
        should('show daily completion goal progress');
      });
    })
    .request(
      gql(`query TodoListSummary {
  todoListSummary {
    totalTodos
    pendingCount
    inProgressCount
    completedCount
    completionPercentage
  }
}`),
    )
    .server(() => {
      data([source().state('TodoListSummary').fromProjection('TodoSummary', 'summaryId')]);
      specs(() => {
        rule('summary shows overall todo list statistics', 'AUTO-r5F6Gs2C', () => {
          example('calculates summary from multiple todos')
            .given<TodoAdded>({
              todoId: 'todo-001',
              description: 'Buy groceries',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .and<TodoAdded>({
              todoId: 'todo-002',
              description: 'Write report',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:10:00.000Z'),
            })
            .and<TodoAdded>({
              todoId: 'todo-003',
              description: 'Call client',
              status: 'pending',
              addedAt: new Date('2030-01-01T09:20:00.000Z'),
            })
            .and<TodoMarkedInProgress>({ todoId: 'todo-001', markedAt: new Date('2030-01-01T10:00:00.000Z') })
            .and<TodoMarkedComplete>({ todoId: 'todo-002', completedAt: new Date('2030-01-01T11:00:00.000Z') })
            .then<TodoListSummary>({
              summaryId: 'main-summary',
              totalTodos: 3,
              pendingCount: 1,
              inProgressCount: 1,
              completedCount: 1,
              completionPercentage: 33,
            });
        });
      });
    });
});
