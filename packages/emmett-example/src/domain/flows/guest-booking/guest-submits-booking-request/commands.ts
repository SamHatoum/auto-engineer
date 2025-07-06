import {Command} from "@event-driven-io/emmett";

export type RequestBooking = Command<
    'RequestBooking',
    {
        propertyId: string;
        hostId: string;
        guestId: string;
        checkIn: string;
        checkOut: string;
        guests: number;
        message: string;
    },
    {
        now: Date;
        bookingId: string;
    }
>;