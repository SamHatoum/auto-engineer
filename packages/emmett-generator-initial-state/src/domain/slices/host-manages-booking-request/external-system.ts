import {NotifyHost} from "./commands";

export const handleNotifyHost = async (command: NotifyHost): Promise<void> => {
    console.log(`Notifying host ${command.data.hostId}:`, command.data.message);
};