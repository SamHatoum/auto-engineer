import {Message} from "./index";


export const messageRegistry = {
    messages: new Map<string, Message>(),

    declare(newMessages: Message[]) {
        for (const msg of newMessages) {
            this.messages.set(msg.name, msg);
        }
    },

    getAll(): Message[] {
        return Array.from(this.messages.values());
    },
};