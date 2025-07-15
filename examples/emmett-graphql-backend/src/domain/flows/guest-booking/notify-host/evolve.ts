import type { NotificationState } from './state';
import type { HostNotified } from './events';

export const evolve = (state: NotificationState, event: HostNotified): NotificationState => {
  switch (event.type) {
    case 'HostNotified':
      return {
        status: 'Notified',
        hostId: event.data.hostId,
        notifiedAt: event.data.notifiedAt,
      };
    default:
      return state;
  }
};
