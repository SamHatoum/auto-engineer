#!/usr/bin/env tsx

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dirs = ['packages', 'apps', 'examples', 'integrations'];
const outputPath = join(process.cwd(), 'CHANGELOG.md');
const header = `# Auto Engineer Changelog\n\n`;

function collectChangelogs(): Map<string, string> {
  const changelogs = new Map<string, string>();
  for (const dir of dirs) {
    const dirPath = join(process.cwd(), dir);
    try {
      const subdirs = readdirSync(dirPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const subdir of subdirs) {
        const path = join(dirPath, subdir, 'CHANGELOG.md');
        try {
          const content = readFileSync(path, 'utf-8').trim();
          if (content) changelogs.set(`${dir}/${subdir}`, content);
        } catch {
          /* empty */
        }
      }
    } catch {
      /* empty */
    }
  }
  return changelogs;
}

function combineChangelogs(changelogs: Map<string, string>): string {
  let content = header;
  for (const [, changelog] of changelogs) {
    content += `${changelog}\n\n`;
  }
  return content.trim() + '\n';
}

try {
  const changelogs = collectChangelogs();
  const combined = changelogs.size ? combineChangelogs(changelogs) : header.trim() + '\n';
  writeFileSync(outputPath, combined);
  console.log(`Combined changelog written to ${outputPath}`);
} catch (error) {
  console.error('Error combining changelogs:', error);
  process.exit(1);
}
