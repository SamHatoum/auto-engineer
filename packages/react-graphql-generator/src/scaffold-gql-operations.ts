import * as fs from 'fs';
import * as path from 'path';
import { IAScheme } from './types';

interface GqlOperation {
  operationType: 'query' | 'mutation';
  operationName: string;
  raw: string;
}

function extractOperationName(gql: string): string {
  const match = gql.match(/(query|mutation)\s+(\w+)/);
  return match ? match[2] : 'UnknownOperation';
}

function extractGqlOperationsFromIAScheme(schema: IAScheme): GqlOperation[] {
  const operations: GqlOperation[] = [];

  function walk(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    const record = obj as Record<string, unknown>;

    if (Array.isArray(record['data_requirements'])) {
      const reqs = record['data_requirements'] as any[];
      for (const req of reqs) {
        if (
          typeof req === 'object' &&
          req !== null &&
          (req.type === 'query' || req.type === 'mutation') &&
          typeof req.details?.gql === 'string'
        ) {
          operations.push({
            operationType: req.type,
            operationName: extractOperationName(req.details.gql),
            raw: req.details.gql.trim(),
          });
        }
      }
    }

    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  walk(schema);
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

  fs.writeFileSync(path.join(graphqlDir, 'queries.ts'), buildFileContent(queries), 'utf-8');
  fs.writeFileSync(path.join(graphqlDir, 'mutations.ts'), buildFileContent(mutations), 'utf-8');
}
