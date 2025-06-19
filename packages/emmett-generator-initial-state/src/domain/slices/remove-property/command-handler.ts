import { CommandHandler, InMemoryEventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import { decide } from './decide';
import type { RemoveProperty } from './commands';

export class RemovePropertyCommandHandler {
    private handler = CommandHandler({
        evolve,
        initialState: initialPropertyState,
    });

    constructor(private eventStore: InMemoryEventStore) {}

    async remove(command: RemoveProperty): Promise<void> {
        const streamId = `property-${command.data.propertyId}`;
        await this.handler(this.eventStore, streamId, (state) =>
            decide(command, state),
        );
    }
}