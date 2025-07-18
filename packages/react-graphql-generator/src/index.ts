import path from 'path';
import fs from 'fs';
import { FrontendScaffoldBuilder } from './builder';
// import { deleteDirectory } from './delete-directory';
import { generateComponents, IAScheme } from './generator/generateComponents';

export async function main() {
  const [, , starterDir, targetDir, iaSchemaPath] = process.argv;
  console.log(process.argv);
  if (!starterDir || !targetDir) {
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir>');
    process.exit(1);
  }

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(starterDir);
  await builder.build(targetDir);

  const filePath = path.resolve(__dirname, iaSchemaPath);
  console.log(filePath);
  const iaSchemeJsonFile = fs.readFileSync(filePath, 'utf-8');
  const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
  generateComponents(iaSchemeJson, `${targetDir}/src`);

  // writeGqlOperationsToFolder(flows, `../../../auto-engineer-output/${appName}/src`);
  // generateSchemaFile(`../../../auto-engineer-output/${appName}`);
  // runCodegen(`../../../auto-engineer-output/${appName}`);
  return 'Frontend Scaffold is running!';
}

void main();

//
