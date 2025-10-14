import { describe, it, expect } from 'vitest';
import { addAutoIds } from './';
import { Model } from '../index';

describe('addAutoIds', () => {
  const flows: Model = {
    variant: 'specs',
    narratives: [
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

    expect(result.narratives[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[1].id).toBe('EXISTING-FLOW-001');
    expect(result.narratives[0].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[0].slices[1].id).toBe('EXISTING-SLICE-001');
    expect(result.narratives[1].slices[0].id).toMatch(AUTO_ID_REGEX);
    const slice0 = result.narratives[0].slices[0];
    const slice1 = result.narratives[1].slices[0];

    if ('server' in slice0 && slice0.server?.specs?.rules != null) {
      expect(slice0.server.specs.rules[0].id).toMatch(AUTO_ID_REGEX);
      expect(slice0.server.specs.rules[1].id).toBe('EXISTING-RULE-001');
    }

    if ('server' in slice1 && slice1.server?.specs?.rules != null) {
      expect(slice1.server.specs.rules[0].id).toMatch(AUTO_ID_REGEX);
    }
  });

  it('should not mutate the original flows', () => {
    const originalFlow = flows.narratives[0];
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

    expect(result.narratives[1].id).toBe('EXISTING-FLOW-001');
    expect(result.narratives[0].slices[1].id).toBe('EXISTING-SLICE-001');

    const testSlice = result.narratives[0].slices[0];
    if ('server' in testSlice && testSlice.server?.specs?.rules != null) {
      expect(testSlice.server.specs.rules[1].id).toBe('EXISTING-RULE-001');
    }
  });

  it('should handle flows without server blocks', () => {
    const modelWithoutServer: Model = {
      variant: 'specs',
      narratives: [
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

    expect(result.narratives[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[0].slices[0].id).toMatch(AUTO_ID_REGEX);
  });

  it('should generate unique IDs for multiple calls', () => {
    const result1 = addAutoIds(flows);
    const result2 = addAutoIds(flows);

    expect(result1.narratives[0].id).not.toBe(result2.narratives[0].id);
    expect(result1.narratives[0].slices[0].id).not.toBe(result2.narratives[0].slices[0].id);
  });

  it('should assign IDs to experience slices', () => {
    const modelWithExperienceSlice: Model = {
      variant: 'specs',
      narratives: [
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
    expect(result.narratives[0].id).toMatch(AUTO_ID_REGEX);

    // Experience slices should get auto IDs where missing
    expect(result.narratives[0].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[0].slices[1].id).toBe('EXISTING-EXPERIENCE-SLICE-001');

    // Experience slices only have client specs (no server specs to test)
  });

  it('should assign unique IDs to multiple flows with same sourceFile', () => {
    const modelWithMultipleFlowsSameSource: Model = {
      variant: 'specs',
      narratives: [
        {
          name: 'Home Screen',
          sourceFile: '/path/to/homepage.narrative.ts',
          slices: [
            {
              name: 'Active Surveys Summary',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show active surveys summary'],
                },
              },
            },
          ],
        },
        {
          name: 'Create Survey',
          sourceFile: '/path/to/homepage.narrative.ts',
          slices: [
            {
              name: 'Create Survey Form',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['allow entering survey title'],
                },
              },
            },
          ],
        },
        {
          name: 'Response Analytics',
          sourceFile: '/path/to/homepage.narrative.ts',
          slices: [
            {
              name: 'Response Rate Charts',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show daily response rate charts'],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const result = addAutoIds(modelWithMultipleFlowsSameSource);

    expect(result.narratives[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[1].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[2].id).toMatch(AUTO_ID_REGEX);

    expect(result.narratives[0].id).not.toBe(result.narratives[1].id);
    expect(result.narratives[0].id).not.toBe(result.narratives[2].id);
    expect(result.narratives[1].id).not.toBe(result.narratives[2].id);

    expect(result.narratives[0].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[1].slices[0].id).toMatch(AUTO_ID_REGEX);
    expect(result.narratives[2].slices[0].id).toMatch(AUTO_ID_REGEX);

    expect(result.narratives[0].slices[0].id).not.toBe(result.narratives[1].slices[0].id);
    expect(result.narratives[0].slices[0].id).not.toBe(result.narratives[2].slices[0].id);
    expect(result.narratives[1].slices[0].id).not.toBe(result.narratives[2].slices[0].id);

    expect(result.narratives[0].sourceFile).toBe('/path/to/homepage.narrative.ts');
    expect(result.narratives[1].sourceFile).toBe('/path/to/homepage.narrative.ts');
    expect(result.narratives[2].sourceFile).toBe('/path/to/homepage.narrative.ts');
  });
});
