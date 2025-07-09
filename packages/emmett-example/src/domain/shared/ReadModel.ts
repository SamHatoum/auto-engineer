import type { InMemoryEventStore } from '@event-driven-io/emmett';

export class ReadModel<T extends { [key: string]: any }> {
    private collection;

    constructor(
        eventStore: InMemoryEventStore,
        collectionName: string
    ) {
        this.collection = eventStore.database.collection<T>(collectionName);
    }

    async getAll(): Promise<T[]> {
        return this.collection.find();
    }

    async getById(id: string, idField: keyof T = 'id' as keyof T): Promise<T | null> {
        return this.collection.findOne((doc) => doc[idField] === id);
    }

    async search(filterFn: (item: T) => boolean): Promise<T[]> {
        return this.collection.find(filterFn);
    }

    async first(filterFn: (item: T) => boolean): Promise<T | null> {
        const all = await this.collection.find(filterFn);
        return all[0] ?? null;
    }
}