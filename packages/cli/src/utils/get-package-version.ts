import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the version from the package.json of the calling module
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns The version string or 'unknown' if not found
 */
export function getPackageVersion(importMetaUrl: string): string {
  try {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);

    // Look for package.json in parent directories (up to 3 levels)
    const possiblePaths = [
      path.join(__dirname, '..', 'package.json'),
      path.join(__dirname, '..', '..', 'package.json'),
      path.join(__dirname, '..', '..', '..', 'package.json'),
    ];

    for (const packageJsonPath of possiblePaths) {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
        return packageJson.version;
      }
    }
  } catch {
    // Fall through to return unknown
  }

  return 'unknown';
}
