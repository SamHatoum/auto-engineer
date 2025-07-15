import { processFlowsWithAI } from './index';
import uxSchema from './auto-ux-schema.json';
import { guestBooksAListingFlow, hostCreatesAListingFlow } from './mock-flows';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';

function extractPropsFromInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  return node.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    return { name, type };
  });
}

function extractPropsFromTypeAlias(
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  if (!ts.isTypeLiteralNode(node.type)) return [];
  return node.type.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    return { name, type };
  });
}

async function getAtomsList(baseDir: string): Promise<{ name: string; props: { name: string; type: string }[] }[]> {
  let atomsDir: string;
  const customDesignSystem = path.join(baseDir, 'design-system');
  try {
    const stat = await fs.stat(customDesignSystem);
    if (stat.isDirectory()) {
      atomsDir = customDesignSystem;
    } else {
      atomsDir = path.join(__dirname, '../design-system-starter');
    }
  } catch {
    atomsDir = path.join(__dirname, '../design-system-starter');
  }
  const files = (await fs.readdir(atomsDir)).filter((f) => f.endsWith('.tsx'));
  const atoms: { name: string; props: { name: string; type: string }[] }[] = [];

  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    let componentName = file.replace(/\.tsx$/, '');
    componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    let props: { name: string; type: string }[] = [];

    // Find exported interface or type for props
    ts.forEachChild(sourceFile, (node) => {
      if (
        ts.isInterfaceDeclaration(node) &&
        node.name.text.toLowerCase().includes(componentName.toLowerCase()) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
      ) {
        props = extractPropsFromInterface(node, sourceFile);
      }
      if (
        ts.isTypeAliasDeclaration(node) &&
        node.name.text.toLowerCase().includes(componentName.toLowerCase()) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
      ) {
        props = extractPropsFromTypeAlias(node, sourceFile);
      }
    });

    // If not found, try to infer from React.forwardRef
    if (props.length === 0) {
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node) && node.declarationList.declarations.length > 0) {
          const decl = node.declarationList.declarations[0];
          if (
            decl.initializer &&
            ts.isCallExpression(decl.initializer) &&
            decl.initializer.expression.getText(sourceFile).includes('React.forwardRef') &&
            decl.initializer.typeArguments &&
            decl.initializer.typeArguments.length > 1
          ) {
            const propsType = decl.initializer.typeArguments[1];
            if (ts.isTypeReferenceNode(propsType)) {
              const typeName = propsType.typeName.getText(sourceFile);
              // Find the type/interface declaration
              ts.forEachChild(sourceFile, (n) => {
                if (ts.isInterfaceDeclaration(n) && n.name.text === typeName) {
                  props = extractPropsFromInterface(n, sourceFile);
                }
                if (ts.isTypeAliasDeclaration(n) && n.name.text === typeName) {
                  props = extractPropsFromTypeAlias(n, sourceFile);
                }
              });
            }
          }
        }
      });
    }

    atoms.push({ name: componentName, props });
  }
  return atoms;
}

async function main() {
  const [, , outputDir] = process.argv;
  if (!outputDir) {
    console.error('Usage: tsx src/generate-ia-schema.ts <output-dir>');
    process.exit(1);
  }

  // You can adjust which flows to use here
  const flows: string[] = [guestBooksAListingFlow, hostCreatesAListingFlow];

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, 'auto-ia-scheme.json');

  let existingSchema: object | undefined = undefined;
  try {
    existingSchema = JSON.parse(await fs.readFile(outPath, 'utf-8')) as object;
    console.log('Existing IA schema found and will be taken into account.');
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      console.error('Error reading existing IA schema:', err);
      process.exit(1);
    }
    // If file does not exist, just continue with existingSchema as undefined
  }

  const atoms = await getAtomsList(outputDir);

  // processFlowsWithAI only accepts three arguments
  const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms);

  await fs.writeFile(outPath, JSON.stringify(iaSchema, null, 2));
  console.log(`Generated IA schema written to ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate IA schema:', err);
  process.exit(1);
});
