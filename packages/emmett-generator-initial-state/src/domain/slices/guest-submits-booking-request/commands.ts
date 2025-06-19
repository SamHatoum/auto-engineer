export type RequestBooking = {
    type: 'RequestBooking';
    data: {
        propertyId: string;
        guestId: string;
        checkIn: string;
        checkOut: string;
        guests: number;
        message: string;
    };
    metadata: {
        now: Date;
        bookingId: string;
    };
};