import { Message } from '../../index';

function hasEnvelope(fields: { name: string }[] = []): boolean {
  const names = new Set(fields.map((f) => f.name));
  return names.has('data') || names.has('type');
}

function effectiveLen(fields: { name: string }[] = []): number {
  return fields.filter((f) => f.name !== 'type' && f.name !== 'data').length;
}

export function preferNewFields(newFields: Message['fields'], oldFields?: Message['fields']): boolean {
  if (oldFields === undefined || oldFields === null) return true;

  const oldHasEnv = hasEnvelope(oldFields);
  const newHasEnv = hasEnvelope(newFields);

  const oldLen = effectiveLen(oldFields);
  const newLen = effectiveLen(newFields);

  // Prefer non-envelope over envelope, but only if the new shape has real fields
  if (oldHasEnv && !newHasEnv) return newLen > 0;
  if (!oldHasEnv && newHasEnv) return false;

  // Otherwise prefer richer (or equal) shapes, counting only real fields
  return newLen >= oldLen;
}
