// integration-helper.ts - Add this to your flowlang package
import { Integration } from './types';

// Global registry for integrations
class GlobalIntegrationRegistry {
    private integrations = new Map<string, Integration>();

    register(integration: Integration) {
        console.log(`[GlobalIntegrationRegistry] Registering integration: ${integration.name}`);
        this.integrations.set(integration.name, integration);
    }

    getAll(): Integration[] {
        return Array.from(this.integrations.values());
    }

    clear() {
        this.integrations.clear();
    }

    get(name: string): Integration | undefined {
        return this.integrations.get(name);
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