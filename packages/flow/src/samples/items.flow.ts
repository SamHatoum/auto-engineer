import { createBuilders } from '../builders';
import { data, flow, should, specs } from '../flow';
import { commandSlice, querySlice } from '../fluent-builder';
import { given, when } from '../testing';
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

const { Events, Commands, State } = createBuilders()
  .events<ItemCreated>()
  .commands<CreateItem>()
  .state<AvailableItems>();

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
        when(
          Commands.CreateItem({
            itemId: 'item_123',
            description: 'A new item',
          }),
        ).then([
          Events.ItemCreated({
            id: 'item_123',
            description: 'A new item',
            addedAt: new Date('2024-01-15T10:00:00Z'),
          }),
        ]);
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
        given([
          Events.ItemCreated({
            id: 'item_123',
            description: 'A new item',
            addedAt: new Date('2024-01-15T10:00:00Z'),
          }),
        ]).then([
          State.AvailableItems({
            id: 'item_123',
            description: 'A new item',
          }),
        ]);
      });
    });
});
