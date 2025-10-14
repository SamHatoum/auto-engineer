import createDebug from 'debug';

export const debugIntegrations = createDebug('auto:flow:getFlows:integrations');
if (typeof debugIntegrations === 'object' && debugIntegrations !== null && 'color' in debugIntegrations) {
  (debugIntegrations as { color: string }).color = '6';
}
