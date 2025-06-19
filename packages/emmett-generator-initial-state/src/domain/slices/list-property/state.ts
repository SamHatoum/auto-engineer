export type EmptyProperty = {
    status: 'Empty';
};

export type ListedProperty = {
    status: 'Listed';
    propertyId: string;
    hostId: string;
    location: string;
    address: string;
    title: string;
    description: string;
    pricePerNight: number;
    maxGuests: number;
    amenities: string[];
};

export type PropertyState = EmptyProperty | ListedProperty;

export const initialPropertyState = (): PropertyState => ({
    status: 'Empty',
});