import {
  command,
  data,
  example,
  gql,
  narrative,
  query,
  rule,
  describe,
  it,
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
type TodoAdded = Event<
  'TodoAdded',
  {
    todoId: string;
    description: string;
    status: 'pending';
    addedAt: Date;
  }
>;
type MarkTodoInProgress = Command<
  'MarkTodoInProgress',
  {
    todoId: string;
  }
>;
type TodoMarkedInProgress = Event<
  'TodoMarkedInProgress',
  {
    todoId: string;
    markedAt: Date;
  }
>;
type MarkTodoComplete = Command<
  'MarkTodoComplete',
  {
    todoId: string;
  }
>;
type TodoMarkedComplete = Event<
  'TodoMarkedComplete',
  {
    todoId: string;
    completedAt: Date;
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
type TodoListSummary = State<
  'TodoListSummary',
  {
    totalTodos: number;
    pendingCount: number;
    inProgressCount: number;
    completedCount: number;
    completionPercentage: number;
  }
>;
narrative('Todo List', 'AUTO-T8dL3k9Xw', () => {
  command('adds a new todo', 'AUTO-A1c4Mn7Bz')
    .client(() => {
      describe('Add Todo', () => {
        it('display a quick-add input field with floating action button');
        it('show success animation when todo is added');
        it('automatically place new todo in "To Do" column');
        it('clear input field after successful addition');
        it('focus back to input for quick consecutive additions');
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
      describe('Move to In Progress', () => {
        it('support drag-and-drop from "To Do" to "In Progress" column');
        it('animate smooth transition between columns');
        it('update column count badges in real-time');
        it('show visual feedback during drag operation');
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
      describe('Complete Todo', () => {
        it('support drag-and-drop to "Done" column');
        it('show celebration animation on completion');
        it('display visual confetti effect for milestone completions');
        it('update completion percentage progress ring');
        it('strike-through completed todo text with smooth animation');
        it('show completion timestamp on hover');
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
      describe('Todo List View', () => {
        it('display todos organized in three columns: To Do, In Progress, Done');
        it('show count badges on each column header');
        it('support drag-and-drop between columns');
        it('display empty state illustrations for empty columns');
        it('show todo cards with glass morphism effect');
        it('display subtle hover effects on todo cards');
        it('support keyboard navigation between todos');
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
      describe('Completion Summary', () => {
        it('display circular progress ring showing completion percentage');
        it('show total task count in center of progress ring');
        it('display breakdown of pending, in-progress, and completed counts');
        it('update progress ring with smooth animation on status changes');
        it('use gradient colors for progress ring');
        it('show daily completion goal progress');
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
      data([source().state('TodoListSummary').fromSingletonProjection('TodoSummary')]);
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
