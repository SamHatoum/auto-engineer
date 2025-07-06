import type { Command } from '@event-driven-io/emmett';

export type RemoveProperty = Command<
    'RemoveProperty',
    {
            propertyId: string;
            hostId: string;
    }
>;