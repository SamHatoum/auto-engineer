export type BookingRequested = {
    type: 'BookingRequested';
    data: {
        bookingId: string;
        propertyId: string;
        guestId: string;
        checkIn: string;
        checkOut: string;
        guests: number;
        message: string;
        status: 'pending_host_approval';
        requestedAt: string;
        expiresAt: string;
    };
};
