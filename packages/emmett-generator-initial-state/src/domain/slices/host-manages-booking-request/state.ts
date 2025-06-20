export type NotificationState =
    | { status: 'Initial' }
    | {
    status: 'Notified';
    hostId: string;
    notifiedAt: string;
};

export const initialNotificationState = (): NotificationState => ({
    status: 'Initial'
});