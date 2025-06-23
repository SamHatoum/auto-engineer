import {CommandSender, InMemoryEventStore} from "@event-driven-io/emmett";

export type ReactorContext = {
    eventStore: InMemoryEventStore;
    commandSender: CommandSender;
};