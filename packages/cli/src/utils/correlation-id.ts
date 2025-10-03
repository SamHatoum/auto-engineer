export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateChildCorrelationId(parentId: string): string {
  return `${parentId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
