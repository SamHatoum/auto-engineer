import {NotifyHost} from "./commands";

export const handleNotifyHost = async (command: NotifyHost): Promise<void> => {
    // email gateway to notify the host
    console.log(`Notifying host ${command.data.hostId}:`, command.data.message);
};