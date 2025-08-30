// integration-helper.ts - Add this to your flow package
import { Integration } from './types';
import createDebug from 'debug';

const debug = createDebug('flow:integrations');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan

// Global registry for integrations
class GlobalIntegrationRegistry {
  private integrations = new Map<string, Integration>();

  register(integration: Integration) {
    debug('Registering integration: %s', integration.name);
    this.integrations.set(integration.name, integration);
    debug('Integration registered successfully: %s, total: %d', integration.name, this.integrations.size);
  }

  getAll(): Integration[] {
    const integrations = Array.from(this.integrations.values());
    debug('Getting all integrations, count: %d', integrations.length);
    if (integrations.length > 0) {
      debug(
        'Integrations: %o',
        integrations.map((i) => i.name),
      );
    }
    return integrations;
  }

  clear() {
    debug('Clearing integrations, current count: %d', this.integrations.size);
    this.integrations.clear();
  }

  get(name: string): Integration | undefined {
    const integration = this.integrations.get(name);
    debug('Getting integration %s: %s', name, integration ? 'found' : 'not found');
    return integration;
  }
}

export const globalIntegrationRegistry = new GlobalIntegrationRegistry();

export const registerIntegrations = (...integrations: Integration[]) => {
  for (const integration of integrations) {
    globalIntegrationRegistry.register(integration);
  }
};

// Export for use in schema generation
export { globalIntegrationRegistry as integrationRegistry };
