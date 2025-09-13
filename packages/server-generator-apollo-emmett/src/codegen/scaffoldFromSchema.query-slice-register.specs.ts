import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from './scaffoldFromSchema';
import type { Model } from '@auto-engineer/flow';

describe('Query slice register file generation', () => {
  it('should not generate register.ts for query slices with data projections', async () => {
    // Create a minimal model with a query slice that has data projections
    const model: Model = {
      variant: 'specs',
      messages: [], // Empty messages array to avoid undefined error
      flows: [
        {
          id: 'flow-1',
          name: 'Questionnaire Flow',
          slices: [
            {
              id: 'AUTO-V7n8Rq5M',
              type: 'query',
              name: 'views the questionnaire',
              client: {
                description: 'Client for viewing questionnaire',
              },
              server: {
                description: 'Views questionnaire progress',
                specs: {
                  name: 'questionnaire progress specs',
                  rules: [
                    {
                      id: 'AUTO-r1A3Bp9W',
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                              },
                            },
                          ],
                          when: {
                            eventRef: 'ViewQuestionnaire',
                            exampleData: { questionnaireId: 'q-001' },
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'QuestionnaireProgress',
                    },
                    origin: {
                      type: 'projection',
                      name: 'Questionnaires',
                      idField: 'questionnaireId',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Generate scaffold plans for the model
    const plans = await generateScaffoldFilePlans(model.flows, model.messages, model.integrations, '/tmp/test');

    // Extract just the filenames from the generated files
    const generatedFileNames = plans.map((plan) => {
      const parts = plan.outputPath.split('/');
      return parts[parts.length - 1];
    });

    // Query slices should NOT generate register.ts files
    expect(generatedFileNames).not.toContain('register.ts');

    // Query slices should generate projection-related files
    expect(generatedFileNames).toContain('projection.ts');
    expect(generatedFileNames).toContain('query.resolver.ts');

    // Query slices should NOT generate command-related files
    expect(generatedFileNames).not.toContain('commands.ts');
    expect(generatedFileNames).not.toContain('handle.ts');
    expect(generatedFileNames).not.toContain('decide.ts');
    expect(generatedFileNames).not.toContain('mutation.resolver.ts');
  });

  it('should generate register.ts for command slices', async () => {
    // Create a minimal model with a command slice
    const model: Model = {
      variant: 'specs',
      messages: [], // Empty messages array to avoid undefined error
      flows: [
        {
          id: 'flow-2',
          name: 'Command Flow',
          slices: [
            {
              id: 'AUTO-CMD123',
              type: 'command',
              name: 'submit answer',
              client: {
                description: 'Submit answer client',
              },
              server: {
                description: 'Submits an answer',
                specs: {
                  name: 'submit answer specs',
                  rules: [
                    {
                      id: 'AUTO-rule123',
                      description: 'should accept valid answers',
                      examples: [
                        {
                          description: 'valid answer submission',
                          when: {
                            commandRef: 'AnswerQuestion',
                            exampleData: {
                              questionnaireId: 'q-001',
                              answer: 'Yes',
                            },
                          },
                          then: [
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                answer: 'Yes',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    };

    // Generate scaffold plans for the model
    const plans = await generateScaffoldFilePlans(model.flows, model.messages, model.integrations, '/tmp/test');

    // Extract just the filenames from the generated files
    const generatedFileNames = plans.map((plan) => {
      const parts = plan.outputPath.split('/');
      return parts[parts.length - 1];
    });

    // Command slices SHOULD generate register.ts files
    expect(generatedFileNames).toContain('register.ts');

    // Command slices should generate command-related files
    expect(generatedFileNames).toContain('commands.ts');
    expect(generatedFileNames).toContain('handle.ts');
    expect(generatedFileNames).toContain('decide.ts');
    expect(generatedFileNames).toContain('mutation.resolver.ts');
  });
});
