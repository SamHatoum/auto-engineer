import { HandlerResult } from './types';
import { MutationResponse } from './types';

export function toMutationResponse(result: HandlerResult): MutationResponse {
    if (result.success) {
        return { success: true };
    }

    return {
        success: false,
        error: {
            type: result.error.type,
            message: result.error.message,
        },
    };
}