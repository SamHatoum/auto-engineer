import { data, flow, should, specs, rule, example } from '../flow';
import { commandSlice, querySlice } from '../fluent-builder';
import gql from 'graphql-tag';
import { source } from '../data-flow-builders';
import { type Event, type Command, type State } from '../types';

type ItemCreated = Event<
  'ItemCreated',
  {
    id: string;
    description: string;
    addedAt: Date;
  }
>;

type CreateItem = Command<
  'CreateItem',
  {
    itemId: string;
    description: string;
  }
>;

type AvailableItems = State<
  'AvailableItems',
  {
    id: string;
    description: string;
  }
>;

flow('items', () => {
  commandSlice('Create item')
    .stream('item-${id}')
    .client(() => {
      specs('A form that allows users to add items', () => {
        should('have fields for id and description');
      });
    })
    .server(() => {
      specs('User can add an item', () => {
        rule('Valid items should be created successfully', () => {
          example('User creates a new item with valid data')
            .when<CreateItem>({
              itemId: 'item_123',
              description: 'A new item',
            })
            .then<ItemCreated>({
              id: 'item_123',
              description: 'A new item',
              addedAt: new Date('2024-01-15T10:00:00Z'),
            });
        });
      });
    });

  querySlice('view items')
    .request(gql`
      query items($itemId: String!) {
        items(itemId: $itemId) {
          id
          description
        }
      }
    `)
    .client(() => {
      specs('view Items Screen', () => {
        should('display all items');
        should('show quantity selectors for each item');
        should('allow removing items');
      });
    })
    .server(() => {
      data([source().state('items').fromProjection('ItemsProjection', 'itemId')]);
      specs('Suggested items are available for viewing', () => {
        rule('Items should be available for viewing after creation', () => {
          example('Item becomes available after creation event')
            .when<ItemCreated>({
              id: 'item_123',
              description: 'A new item',
              addedAt: new Date('2024-01-15T10:00:00Z'),
            })
            .then<AvailableItems>({
              id: 'item_123',
              description: 'A new item',
            });
        });
      });
    });
});
