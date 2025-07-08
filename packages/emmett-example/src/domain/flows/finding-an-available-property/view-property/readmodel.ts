import type { InMemoryEventStore } from '@event-driven-io/emmett';
import {ViewProperty} from "./state";

export class ViewPropertyReadModel {
    private collection;

    constructor(eventStore: InMemoryEventStore) {
        this.collection = eventStore.database.collection<ViewProperty>('viewProperties');
    }

    async get(propertyId: string): Promise<ViewProperty | null> {
        return this.collection.findOne(p => p.propertyId === propertyId);
    }
}