import type { InMemoryEventStore } from '@event-driven-io/emmett';

export type AvailableProperty = {
    propertyId: string;
    title: string;
    location: string;
    pricePerNight: number;
    maxGuests: number;
};

export class AvailableProperties {
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
            return !(minGuests && property.maxGuests < minGuests);

        });
    }
}