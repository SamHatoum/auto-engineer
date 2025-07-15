import path from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function ensureDirPath(...segments: string[]): string {
  return path.join(...segments);
}

export async function ensureDirExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}
