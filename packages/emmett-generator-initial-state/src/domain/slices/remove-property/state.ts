export type EmptyProperty = {
    status: 'Empty';
};

export type ListedProperty = {
    status: 'Listed';
    propertyId: string;
};

export type RemovedProperty = {
    status: 'Removed';
    propertyId: string;
};



export type PropertyState = ListedProperty | RemovedProperty | EmptyProperty;

export const initialPropertyState = (): PropertyState => ({
    status: 'Empty',
});