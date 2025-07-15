import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import { RemoveProperty } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
    messageBus.handle(
        (command: RemoveProperty) => handle(eventStore, command),
        'RemoveProperty'
    );
}