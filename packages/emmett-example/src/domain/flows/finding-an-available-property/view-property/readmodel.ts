import type { InMemoryEventStore } from '@event-driven-io/emmett';

export type ViewProperty = {
    propertyId: string;
    title: string;
    location: string;
    address: string;
    description: string;
    amenities: string[];
};

export class ViewPropertyReadModel {
    private collection;

    constructor(eventStore: InMemoryEventStore) {
        this.collection = eventStore.database.collection<ViewProperty>('viewProperties');
    }

    async get(propertyId: string): Promise<ViewProperty | null> {
        return this.collection.findOne(p => p.propertyId === propertyId);
    }
}