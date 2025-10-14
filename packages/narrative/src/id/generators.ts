import { generateId } from '@auto-engineer/id';

export function generateAutoId(): string {
  return generateId({ prefix: 'AUTO-' });
}
