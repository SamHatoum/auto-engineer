export function matchesFlowPattern(fileName: string, flowName: string): boolean {
  const flowNameLower = flowName.toLowerCase();
  const patterns = [
    flowNameLower.replace(/\s+/g, '-'),
    flowNameLower.replace(/\s+/g, ''),
    flowNameLower.replace(/\s+/g, '_'),
    flowNameLower,
  ];

  return patterns.some((pattern) => fileName.includes(pattern));
}
