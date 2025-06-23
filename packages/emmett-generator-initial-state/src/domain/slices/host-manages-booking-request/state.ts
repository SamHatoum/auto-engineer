export type NotificationState =
    | { status: 'Initial' }
    | {
    status: 'Notified';
    hostId: string;
    notifiedAt: Date;
};

export const initialNotificationState = (): NotificationState => ({
    status: 'Initial'
});