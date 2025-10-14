import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model as SpecsSchema } from '@auto-engineer/narrative';

describe('state.ts.ejs', () => {
  it('should generate a valid state definition file for a query slice with a state message', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'Inventory management',
          slices: [
            {
              type: 'query',
              name: 'Get available items',
              client: {
                description: 'Client view of available items',
              },
              server: {
                description: 'Projects available items',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      name: 'ItemCreated',
                      idField: 'id',
                    },
                    target: {
                      type: 'State',
                      name: 'AvailableItems',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'AvailableItems',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'inStock', type: 'boolean', required: true },
            { name: 'addedAt', type: 'Date', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const stateFile = plans.find((p) => p.outputPath.endsWith('state.ts'));

    expect(stateFile?.contents).toMatchInlineSnapshot(`
      "export type AvailableItems = {
        id: string;
        name: string;
        price: number;
        inStock: boolean;
        addedAt: Date;
      };
      "
    `);
  });
});
