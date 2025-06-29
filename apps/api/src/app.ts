import { MessageBus } from '@auto-engineer/message-bus';

const messageBus = new MessageBus();

export const app = {
  messageBus,
}