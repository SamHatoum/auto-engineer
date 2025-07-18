import { FrontendScaffoldBuilder } from './builder';

export async function main() {
  const [, , starterDir, targetDir] = process.argv;
  if (!starterDir || !targetDir) {
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir>');
    process.exit(1);
  }
  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(starterDir);
  await builder.build(targetDir);
  return 'Frontend Scaffold is running!';
}

void main();
