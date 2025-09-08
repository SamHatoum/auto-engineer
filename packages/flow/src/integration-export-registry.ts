import { Integration } from './types';
import { IntegrationExport } from './loader/ts-utils';

/**
 * Global registry to map integration internal names to their export names
 */
class IntegrationExportRegistry {
  private integrationNameToExportName = new Map<string, string>();
  private exportNameToIntegrationName = new Map<string, string>();

  /**
   * Register integration exports from AST parsing
   */
  registerIntegrationExports(integrationExports: IntegrationExport[]): void {
    for (const { exportName, integrationName } of integrationExports) {
      this.integrationNameToExportName.set(integrationName, exportName);
      this.exportNameToIntegrationName.set(exportName, integrationName);
    }
  }

  /**
   * Get the export name for an integration based on its internal name
   */
  getExportName(integrationName: string): string | undefined {
    return this.integrationNameToExportName.get(integrationName);
  }

  /**
   * Get the integration name for an export name
   */
  getIntegrationName(exportName: string): string | undefined {
    return this.exportNameToIntegrationName.get(exportName);
  }

  /**
   * Get the export name for an Integration object
   * Uses the object's exportName property first, then falls back to registry lookup
   */
  getExportNameForIntegration(integration: Integration): string {
    // First try the exportName property if set
    if (integration.exportName !== null && integration.exportName !== undefined && integration.exportName !== '') {
      return integration.exportName;
    }

    // Fall back to registry lookup
    const exportName = this.getExportName(integration.name);
    return exportName !== null && exportName !== undefined && exportName !== '' ? exportName : integration.name; // Ultimate fallback to internal name
  }

  /**
   * Clear all registered exports
   */
  clear(): void {
    this.integrationNameToExportName.clear();
    this.exportNameToIntegrationName.clear();
  }

  /**
   * Get all registered integration exports
   */
  getAll(): IntegrationExport[] {
    const exports: IntegrationExport[] = [];
    for (const [integrationName, exportName] of this.integrationNameToExportName) {
      exports.push({ exportName, integrationName });
    }
    return exports;
  }
}

// Global singleton registry
export const integrationExportRegistry = new IntegrationExportRegistry();
