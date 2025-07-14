import * as fs from 'fs';
import * as path from 'path';

interface GqlOperation {
  operationType: 'query' | 'mutation';
  operationName: string;
  raw: string;
}

function extractGqlOperations(flow: string): GqlOperation[] {
  const gqlRegex = /gql`([\s\S]*?)`/g;
  const operations: GqlOperation[] = [];

  let match: RegExpExecArray | null;
  while ((match = gqlRegex.exec(flow)) !== null) {
    const raw = match[1].trim();
    const operationMatch = raw.match(/^(query|mutation)\s+(\w+)/);

    if (operationMatch) {
      const [, operationType, operationName] = operationMatch;
      operations.push({
        operationType: operationType as 'query' | 'mutation',
        operationName,
        raw
      });
    }
  }

  return operations;
}

function formatWithTabs(text: string): string {
  return text
    .split('\n')
    .map(line => '\t' + line)
    .join('\n');
}

function buildFileContent(operations: GqlOperation[]): string {
  const header = `import { graphql } from '../gql';\n`;
  const entries = operations.map(op => {
    const formatted = formatWithTabs(op.raw);
    return `\nexport const ${op.operationName} = graphql(\`\n${formatted}\n\`);`;
  });

  return header + entries.join('\n');
}

export function writeGqlOperationsToFolder(flows: string[], outputDir: string) {
  const allOperations: GqlOperation[] = flows.flatMap(extractGqlOperations);

  const queries = allOperations.filter(op => op.operationType === 'query');
  const mutations = allOperations.filter(op => op.operationType === 'mutation');

  const graphqlDir = path.join(outputDir, 'graphql');
  fs.mkdirSync(graphqlDir, { recursive: true });

  fs.writeFileSync(path.join(graphqlDir, 'queries.ts'), buildFileContent(queries), 'utf-8');
  fs.writeFileSync(path.join(graphqlDir, 'mutations.ts'), buildFileContent(mutations), 'utf-8');
}
