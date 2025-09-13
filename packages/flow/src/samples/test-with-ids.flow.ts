import { flow, specs, rule, example } from '../flow';
import { command, query, react } from '../fluent-builder';
import { type Event, type Command, type State } from '../types';

type TestItemCreated = Event<
  'TestItemCreated',
  {
    id: string;
    name: string;
    createdAt: Date;
  }
>;

type CreateTestItem = Command<
  'CreateTestItem',
  {
    itemId: string;
    name: string;
  }
>;

type TestItemState = State<
  'TestItemState',
  {
    id: string;
    name: string;
  }
>;

flow('Test Flow with IDs', 'FLOW-001', () => {
  command('Create test item', 'SLICE-001')
    .client(() => {})
    .server(() => {
      specs('Test item creation specs', () => {
        rule('Valid test items should be created successfully', 'RULE-001', () => {
          example('User creates a new test item with valid data')
            .when<CreateTestItem>({
              itemId: 'test_123',
              name: 'Test Item',
            })
            .then<TestItemCreated>({
              id: 'test_123',
              name: 'Test Item',
              createdAt: new Date('2024-01-15T10:00:00Z'),
            });
        });

        rule('Invalid test items should be rejected', 'RULE-002', () => {
          example('User tries to create item with empty name')
            .when<CreateTestItem>({
              itemId: 'test_456',
              name: '',
            })
            .then([
              {
                errorType: 'ValidationError' as const,
                message: 'Item name cannot be empty',
              },
            ]);
        });
      });
    });

  query('Get test items', 'SLICE-002')
    .client(() => {})
    .server(() => {
      specs('Test item retrieval specs', () => {
        rule('Items should be retrievable after creation', 'RULE-003', () => {
          example('Item becomes available after creation event')
            .when<TestItemCreated>({
              id: 'test_123',
              name: 'Test Item',
              createdAt: new Date('2024-01-15T10:00:00Z'),
            })
            .then<TestItemState>({
              id: 'test_123',
              name: 'Test Item',
            });
        });
      });
    });

  react('React to test event', 'SLICE-003').server(() => {
    specs('Test event reaction specs', () => {
      rule('System should react to test item creation', 'RULE-004', () => {
        example('Notification sent when test item is created')
          .when([
            {
              eventRef: 'TestItemCreated',
              exampleData: {
                id: 'test_789',
                name: 'Another Test Item',
                createdAt: new Date('2024-01-16T10:00:00Z'),
              },
            },
          ])
          .then([
            {
              commandRef: 'SendNotification',
              exampleData: {
                message: 'New test item created: Another Test Item',
                recipientId: 'admin',
              },
            },
          ]);
      });
    });
  });
});
