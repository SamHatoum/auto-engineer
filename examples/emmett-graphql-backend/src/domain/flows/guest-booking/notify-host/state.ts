export type NotificationState =
  | { status: 'Initial' }
  | {
      status: 'Notified';
      hostId: string;
      notifiedAt: Date;
    };

export const initialState = (): NotificationState => ({
  status: 'Initial',
});
