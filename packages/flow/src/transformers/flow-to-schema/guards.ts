export function hasDestination(d: unknown): d is { destination: unknown } {
  return typeof d === 'object' && d !== null && 'destination' in d;
}

export function hasOrigin(d: unknown): d is { origin: unknown } {
  return typeof d === 'object' && d !== null && 'origin' in d;
}

export function hasWithState(d: unknown): d is { _withState: unknown } {
  return typeof d === 'object' && d !== null && '_withState' in d;
}

export function isValidIntegration(
  integration: unknown,
): integration is { type: 'integration'; systems: string[]; message?: unknown } {
  return (
    typeof integration === 'object' &&
    integration !== null &&
    'type' in integration &&
    integration.type === 'integration' &&
    'systems' in integration &&
    Array.isArray(integration.systems)
  );
}
