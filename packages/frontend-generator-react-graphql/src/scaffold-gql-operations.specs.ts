import { describe, test, expect } from 'vitest';
import { mergeGraphQLQueries } from './scaffold-gql-operations';

describe('GraphQL Query Field Merging', () => {
  test('should merge identical queries with different field selections', () => {
    const query1 = `
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
          status
          answers {
            questionId
            value
          }
        }
      }
    `;

    const query2 = `
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
          participantId
          status
          currentQuestionId
        }
      }
    `;

    const operations = [
      {
        operationType: 'query' as const,
        operationName: 'QuestionnaireProgress',
        raw: query1.trim(),
      },
      {
        operationType: 'query' as const,
        operationName: 'QuestionnaireProgress',
        raw: query2.trim(),
      },
    ];

    const merged = mergeGraphQLQueries(operations);

    expect(merged).toHaveLength(1);
    expect(merged[0].operationName).toBe('QuestionnaireProgress');

    // Check that all fields from both queries are present
    const mergedQuery = merged[0].raw;
    expect(mergedQuery).toContain('questionnaireId');
    expect(mergedQuery).toContain('participantId');
    expect(mergedQuery).toContain('status');
    expect(mergedQuery).toContain('currentQuestionId');
    expect(mergedQuery).toContain('answers {');
    expect(mergedQuery).toContain('questionId');
    expect(mergedQuery).toContain('value');
  });

  test('should handle nested field merging correctly', () => {
    const query1 = `
      query UserProfile($id: ID!) {
        user(id: $id) {
          id
          profile {
            name
            email
          }
        }
      }
    `;

    const query2 = `
      query UserProfile($id: ID!) {
        user(id: $id) {
          id
          username
          profile {
            avatar
            bio
          }
        }
      }
    `;

    const operations = [
      {
        operationType: 'query' as const,
        operationName: 'UserProfile',
        raw: query1.trim(),
      },
      {
        operationType: 'query' as const,
        operationName: 'UserProfile',
        raw: query2.trim(),
      },
    ];

    const merged = mergeGraphQLQueries(operations);

    expect(merged).toHaveLength(1);

    const mergedQuery = merged[0].raw;
    expect(mergedQuery).toContain('id');
    expect(mergedQuery).toContain('username');
    expect(mergedQuery).toContain('profile {');
    expect(mergedQuery).toContain('name');
    expect(mergedQuery).toContain('email');
    expect(mergedQuery).toContain('avatar');
    expect(mergedQuery).toContain('bio');
  });

  test('should not merge queries with different operation names', () => {
    const query1 = `
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
        }
      }
    `;

    const query2 = `
      query UserProfile($id: ID!) {
        user(id: $id) {
          id
        }
      }
    `;

    const operations = [
      {
        operationType: 'query' as const,
        operationName: 'QuestionnaireProgress',
        raw: query1.trim(),
      },
      {
        operationType: 'query' as const,
        operationName: 'UserProfile',
        raw: query2.trim(),
      },
    ];

    const merged = mergeGraphQLQueries(operations);

    expect(merged).toHaveLength(2);
    expect(merged.map((op) => op.operationName)).toContain('QuestionnaireProgress');
    expect(merged.map((op) => op.operationName)).toContain('UserProfile');
  });

  test('should not merge queries with different variables', () => {
    const query1 = `
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
        }
      }
    `;

    const query2 = `
      query QuestionnaireProgress($userId: ID!) {
        questionnaireProgress(participantId: $userId) {
          questionnaireId
        }
      }
    `;

    const operations = [
      {
        operationType: 'query' as const,
        operationName: 'QuestionnaireProgress',
        raw: query1.trim(),
      },
      {
        operationType: 'query' as const,
        operationName: 'QuestionnaireProgress',
        raw: query2.trim(),
      },
    ];

    const merged = mergeGraphQLQueries(operations);

    // Should not merge since variables are different
    expect(merged).toHaveLength(2);
  });

  test('should handle mutations separately from queries', () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
        }
      }
    `;

    const mutation = `
      mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
          id
        }
      }
    `;

    const operations = [
      {
        operationType: 'query' as const,
        operationName: 'GetUser',
        raw: query.trim(),
      },
      {
        operationType: 'mutation' as const,
        operationName: 'CreateUser',
        raw: mutation.trim(),
      },
    ];

    const merged = mergeGraphQLQueries(operations);

    expect(merged).toHaveLength(2);
    expect(merged.find((op) => op.operationType === 'query')).toBeDefined();
    expect(merged.find((op) => op.operationType === 'mutation')).toBeDefined();
  });
});
