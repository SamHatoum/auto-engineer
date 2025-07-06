import {createBuilders} from "../builders";
import {flow, should, specs} from "../flow";
import {commandSlice} from "../fluent-builder";
import {when} from "../testing";

export interface ItemCreated {
    type: 'ItemCreated';
    data: {
        id: string;
        description: string;
        addedAt: Date;
    };
}

export interface CreateItem {
    type: 'CreateItem';
    data: {
        itemId: string;
        description: string;
    };
}

export interface AvailableItems {
    type: 'AvailableItems';
    data: {
        id: string;
        description: string;
    };
}


const { Events, Commands } = createBuilders()
    .events<ItemCreated>()
    .commands<CreateItem>()
    .state<{ items: AvailableItems }>()


flow('Add item', () => {
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
                        description: 'A new item'
                    })
                ).then([
                    Events.ItemCreated({
                        id: 'item_123',
                        description: 'A new item',
                        addedAt: new Date('2024-01-15T10:00:00Z')
                    })
                ]);
            });
        });
});