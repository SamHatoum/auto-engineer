import * as fs from 'fs';
import * as path from 'path';

export function deleteDirectory(targetPath: string): void {
  const resolvedPath = path.resolve(targetPath);

  if (!fs.existsSync(resolvedPath)) {
    console.warn(`⚠️ Directory does not exist: ${resolvedPath}`);
    return;
  }

  try {
    fs.rmSync(resolvedPath, { recursive: true, force: true });
    console.log(`✅ Deleted directory: ${resolvedPath}`);
  } catch (error) {
    console.error(`❌ Failed to delete directory: ${resolvedPath}`, error);
  }
}
