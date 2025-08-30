import * as fs from 'fs';
import * as path from 'path';
import { IAScheme } from './types';

interface GqlOperation {
  operationType: 'query' | 'mutation';
  operationName: string;
  raw: string;
}

interface DataRequirement {
  type: 'query' | 'mutation';
  details?: {
    gql?: string;
  };
}

function extractOperationName(gql: string): string {
  const match = gql.match(/(query|mutation)\s+(\w+)/);
  return match ? match[2] : 'UnknownOperation';
}

function isValidDataRequirement(req: unknown): req is DataRequirement {
  return (
    typeof req === 'object' &&
    req !== null &&
    'type' in req &&
    (req.type === 'query' || req.type === 'mutation') &&
    'details' in req &&
    typeof req.details === 'object' &&
    req.details !== null &&
    'gql' in req.details &&
    typeof req.details.gql === 'string'
  );
}

function processDataRequirements(record: Record<string, unknown>, operations: GqlOperation[]): void {
  const dataReqs = record['data_requirements'];
  if (!Array.isArray(dataReqs)) return;

  for (const req of dataReqs) {
    if (isValidDataRequirement(req)) {
      operations.push({
        operationType: req.type,
        operationName: extractOperationName(req.details!.gql!),
        raw: req.details!.gql!.trim(),
      });
    }
  }
}

function walk(obj: unknown, operations: GqlOperation[]): void {
  if (typeof obj !== 'object' || obj === null) return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => walk(item, operations));
    return;
  }

  const record = obj as Record<string, unknown>;
  processDataRequirements(record, operations);

  for (const value of Object.values(record)) {
    walk(value, operations);
  }
}

function extractGqlOperationsFromIAScheme(schema: IAScheme): GqlOperation[] {
  const operations: GqlOperation[] = [];
  walk(schema, operations);
  return operations;
}

function buildFileContent(operations: GqlOperation[]): string {
  const header = `import { graphql } from '../gql';\n`;
  const entries = operations.map((op) => {
    return `\nexport const ${op.operationName} = graphql(\`\n${op.raw}\n\`);`;
  });

  return header + entries.join('\n');
}

export function writeGqlOperationsToFolder(iaScheme: IAScheme, outputDir: string) {
  const allOperations = extractGqlOperationsFromIAScheme(iaScheme);

  const uniqueSet = new Set<string>();
  const uniqueOperations: GqlOperation[] = [];

  for (const op of allOperations) {
    const key = `${op.operationType}:${op.operationName}:${op.raw}`;
    if (!uniqueSet.has(key)) {
      uniqueOperations.push(op);
      uniqueSet.add(key);
    }
  }

  const queries = uniqueOperations.filter((op) => op.operationType === 'query');
  const mutations = uniqueOperations.filter((op) => op.operationType === 'mutation');

  const graphqlDir = path.join(outputDir, 'graphql');
  fs.mkdirSync(graphqlDir, { recursive: true });

  const queriesPath = path.join(graphqlDir, 'queries.ts');
  const mutationsPath = path.join(graphqlDir, 'mutations.ts');

  fs.writeFileSync(queriesPath, buildFileContent(queries), 'utf-8');
  fs.writeFileSync(mutationsPath, buildFileContent(mutations), 'utf-8');
}
