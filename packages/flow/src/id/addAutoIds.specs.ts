import { describe, it, expect } from 'vitest';
import { addAutoIds } from './';
import { Model } from '../index';

describe('addAutoIds', () => {
  const flows: Model = {
    variant: 'specs',
    flows: [
      {
        name: 'Test Flow',
        slices: [
          {
            type: 'command',
            name: 'Test Command Slice',
            client: { description: 'Test client' },
            server: {
              description: 'Test server',
              specs: {
                name: 'Test Specs',
                rules: [
                  {
                    description: 'Test rule without ID',
                    examples: [],
                  },
                  {
                    id: 'EXISTING-RULE-001',
                    description: 'Test rule with existing ID',
                    examples: [],
                  },
                ],
              },
            },
          },
          {
            type: 'query',
            name: 'Test Query Slice',
            id: 'EXISTING-SLICE-001',
            client: { description: 'Test client' },
            server: {
              description: 'Test server',
              specs: {
                name: 'Test Specs',
                rules: [],
              },
            },
          },
        ],
      },
      {
        name: 'Flow with ID',
        id: 'EXISTING-FLOW-001',
        slices: [
          {
            type: 'react',
            name: 'React Slice',
            server: {
              description: 'React server',
              specs: {
                name: 'React Specs',
                rules: [
                  {
                    description: 'React rule',
                    examples: [],
                  },
                ],
              },
            },
          },
        ],
      },
    ],
    messages: [],
    integrations: [],
  };

  const AUTO_ID_REGEX = /^AUTO-[A-Za-z0-9_]{9}$/;

  it('should assign IDs to entities that do not have them', () => {
    const result = addAutoIds(flows);

    expect(result.flows[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.flows[1].id).toBe('EXISTING-FLOW-001');
    expect(result.flows[0].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.flows[0].slices[1].id).toBe('EXISTING-SLICE-001');
    expect(result.flows[1].slices[0].id).toMatch(AUTO_ID_REGEX);
    const slice0 = result.flows[0].slices[0];
    const slice1 = result.flows[1].slices[0];

    if ('server' in slice0 && slice0.server?.specs?.rules != null) {
      expect(slice0.server.specs.rules[0].id).toMatch(AUTO_ID_REGEX);
      expect(slice0.server.specs.rules[1].id).toBe('EXISTING-RULE-001');
    }

    if ('server' in slice1 && slice1.server?.specs?.rules != null) {
      expect(slice1.server.specs.rules[0].id).toMatch(AUTO_ID_REGEX);
    }
  });

  it('should not mutate the original flows', () => {
    const originalFlow = flows.flows[0];
    const originalSlice = originalFlow.slices[0];

    addAutoIds(flows);

    expect(originalFlow.id).toBeUndefined();
    expect(originalSlice.id).toBeUndefined();
    if (
      'server' in originalSlice &&
      originalSlice.server?.specs?.rules !== undefined &&
      originalSlice.server.specs.rules.length > 0
    ) {
      expect(originalSlice.server.specs.rules[0].id).toBeUndefined();
    }
  });

  it('should preserve existing IDs and not overwrite them', () => {
    const result = addAutoIds(flows);

    expect(result.flows[1].id).toBe('EXISTING-FLOW-001');
    expect(result.flows[0].slices[1].id).toBe('EXISTING-SLICE-001');

    const testSlice = result.flows[0].slices[0];
    if ('server' in testSlice && testSlice.server?.specs?.rules != null) {
      expect(testSlice.server.specs.rules[1].id).toBe('EXISTING-RULE-001');
    }
  });

  it('should handle flows without server blocks', () => {
    const modelWithoutServer: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Simple Flow',
          slices: [
            {
              type: 'command',
              name: 'Simple Command',
              client: { description: 'Simple client' },
              server: {
                description: 'Simple server',
                specs: {
                  name: 'Simple specs',
                  rules: [],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const result = addAutoIds(modelWithoutServer);

    expect(result.flows[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.flows[0].slices[0].id).toMatch(AUTO_ID_REGEX);
  });

  it('should generate unique IDs for multiple calls', () => {
    const result1 = addAutoIds(flows);
    const result2 = addAutoIds(flows);

    expect(result1.flows[0].id).not.toBe(result2.flows[0].id);
    expect(result1.flows[0].slices[0].id).not.toBe(result2.flows[0].slices[0].id);
  });

  it('should assign IDs to experience slices', () => {
    const modelWithExperienceSlice: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Experience Flow',
          slices: [
            {
              type: 'experience',
              name: 'User Onboarding Experience',
              client: {
                description: 'User onboarding client',
                specs: {
                  name: 'Onboarding Specs',
                  rules: ['User should see welcome message', 'User should complete profile setup'],
                },
              },
            },
            {
              type: 'experience',
              name: 'Checkout Experience',
              id: 'EXISTING-EXPERIENCE-SLICE-001',
              client: {
                description: 'Checkout client',
                specs: {
                  name: 'Checkout Specs',
                  rules: ['User should review cart items'],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const result = addAutoIds(modelWithExperienceSlice);

    // Flow should get an auto ID
    expect(result.flows[0].id).toMatch(AUTO_ID_REGEX);

    // Experience slices should get auto IDs where missing
    expect(result.flows[0].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.flows[0].slices[1].id).toBe('EXISTING-EXPERIENCE-SLICE-001');

    // Experience slices only have client specs (no server specs to test)
  });
});
