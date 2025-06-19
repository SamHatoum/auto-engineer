import { CommandHandler, InMemoryEventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import { listProperty } from './decide';
import type { ListProperty } from './commands';

export class ListPropertyCommandHandler {
    private handler = CommandHandler({
        evolve,
        initialState: initialPropertyState,
    });

    constructor(private eventStore: InMemoryEventStore) {}

    async list(command: ListProperty): Promise<void> {
        const streamId = `property-${command.data.propertyId}`;
        await this.handler(this.eventStore, streamId, (state) =>
            listProperty(command, state),
        );
    }
}