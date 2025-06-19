import type { InMemoryEventStore } from '@event-driven-io/emmett';
import {AvailableProperty} from "./views";

export class AvailablePropertiesReadModel {
    private collection;

    constructor(eventStore: InMemoryEventStore) {
        this.collection = eventStore.database.collection<AvailableProperty>('availableProperties');
    }

    async getAll(): Promise<AvailableProperty[]> {
        return this.collection.find();
    }

    async search(
        location?: string,
        maxPrice?: number,
        minGuests?: number
    ): Promise<AvailableProperty[]> {
        return this.collection.find((property) => {
            if (location && !property.location.toLowerCase().includes(location.toLowerCase())) return false;
            if (maxPrice && property.pricePerNight > maxPrice) return false;
            if (minGuests && property.maxGuests < minGuests) return false;
            return true;
        });
    }
}