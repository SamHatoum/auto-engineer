import { flow, specs, rule, example } from '../flow';
import { query } from '../fluent-builder';
import { type Event, type State } from '../types';

type ConfigState = State<
  'ConfigState',
  {
    configId: string;
    maxItems: number;
  }
>;

type ItemAdded = Event<
  'ItemAdded',
  {
    itemId: string;
    addedAt: Date;
  }
>;

type SystemInitialized = Event<
  'SystemInitialized',
  {
    systemId: string;
    timestamp: Date;
  }
>;

type SystemStatus = State<
  'SystemStatus',
  {
    systemId: string;
    itemCount: number;
    status: 'ready' | 'full';
  }
>;

flow('Mixed Given Types', 'FLOW-MGT', () => {
  query('system status check', 'SLICE-MGT-001')
    .client(() => {})
    .server(() => {
      specs('System status specs', () => {
        rule('system reaches full capacity when configured limit is reached', 'RULE-MGT-001', () => {
          example('system with 2 items reaches max of 2')
            .given<ConfigState>({
              configId: 'config-001',
              maxItems: 2,
            })
            .and<SystemInitialized>({
              systemId: 'system-001',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            })
            .and<ItemAdded>({
              itemId: 'item-001',
              addedAt: new Date('2024-01-01T10:01:00Z'),
            })
            .and<ItemAdded>({
              itemId: 'item-002',
              addedAt: new Date('2024-01-01T10:02:00Z'),
            })
            .when({}) // empty when clause
            .then<SystemStatus>({
              systemId: 'system-001',
              itemCount: 2,
              status: 'full',
            });
        });
      });
    });
});
