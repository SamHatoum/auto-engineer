export type BookingState =
  | { status: 'Empty' }
  | {
      status: 'Pending';
      bookingId: string;
    };

export const initialBookingState = (): BookingState => ({ status: 'Empty' });
