import type {Event} from '@event-driven-io/emmett';

export type PropertyListed = Event<
    'PropertyListed',
    {
        propertyId: string;
        hostId: string;
        location: string;
        address: string;
        title: string;
        description: string;
        pricePerNight: number;
        maxGuests: number;
        amenities: string[];
        listedAt: Date;
    }
>;