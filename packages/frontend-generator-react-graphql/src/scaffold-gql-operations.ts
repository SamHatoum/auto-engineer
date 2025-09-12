import * as fs from 'fs';
import * as path from 'path';
import {
  parse,
  print,
  DocumentNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
  VariableDefinitionNode,
  Kind,
} from 'graphql';
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

function mergeSelectionSets(selectionSet1: SelectionSetNode, selectionSet2: SelectionSetNode): SelectionSetNode {
  const fieldMap = new Map<string, FieldNode>();

  // Process first selection set
  for (const selection of selectionSet1.selections) {
    if (selection.kind === 'Field') {
      const key = selection.alias?.value || selection.name.value;
      fieldMap.set(key, selection);
    }
  }

  // Process second selection set, merging nested selections
  for (const selection of selectionSet2.selections) {
    if (selection.kind === 'Field') {
      const key = selection.alias?.value || selection.name.value;
      const existing = fieldMap.get(key);

      if (existing && existing.selectionSet && selection.selectionSet) {
        // Merge nested selection sets
        const mergedSelectionSet = mergeSelectionSets(existing.selectionSet, selection.selectionSet);
        fieldMap.set(key, {
          ...existing,
          selectionSet: mergedSelectionSet,
        });
      } else if (!existing) {
        // Add new field
        fieldMap.set(key, selection);
      }
    }
  }

  return {
    kind: Kind.SELECTION_SET,
    selections: Array.from(fieldMap.values()),
  };
}

function mergeOperations(
  operation1: OperationDefinitionNode,
  operation2: OperationDefinitionNode,
): OperationDefinitionNode {
  if (!operation1.selectionSet || !operation2.selectionSet) {
    throw new Error('Operations must have selection sets');
  }

  const mergedSelectionSet = mergeSelectionSets(operation1.selectionSet, operation2.selectionSet);

  return {
    ...operation1,
    selectionSet: mergedSelectionSet,
  };
}

function getOperationSignature(operation: OperationDefinitionNode): string {
  const name = operation.name?.value || 'Anonymous';
  const variables =
    operation.variableDefinitions?.map((v) => `${v.variable.name.value}: ${print(v.type)}`).join(', ') || '';
  return `${operation.operation}:${name}:(${variables})`;
}

export function mergeGraphQLQueries(operations: GqlOperation[]): GqlOperation[] {
  const operationGroups = new Map<string, GqlOperation[]>();

  // Group operations by signature (operation type, name, and variables)
  for (const op of operations) {
    try {
      const document = parse(op.raw);
      const operation = document.definitions[0] as OperationDefinitionNode;
      const signature = getOperationSignature(operation);

      if (!operationGroups.has(signature)) {
        operationGroups.set(signature, []);
      }
      operationGroups.get(signature)!.push(op);
    } catch (error) {
      // If parsing fails, keep the original operation
      const fallbackSignature = `${op.operationType}:${op.operationName}:fallback:${Math.random()}`;
      operationGroups.set(fallbackSignature, [op]);
    }
  }

  const mergedOperations: GqlOperation[] = [];

  // Merge operations within each group
  for (const [signature, group] of operationGroups) {
    if (group.length === 1) {
      mergedOperations.push(group[0]);
    } else {
      try {
        // Parse all operations in the group
        const parsedOperations = group.map((op) => {
          const document = parse(op.raw);
          return document.definitions[0] as OperationDefinitionNode;
        });

        // Merge all operations in the group
        let mergedOperation = parsedOperations[0];
        for (let i = 1; i < parsedOperations.length; i++) {
          mergedOperation = mergeOperations(mergedOperation, parsedOperations[i]);
        }

        // Create the merged document and print it
        const mergedDocument: DocumentNode = {
          kind: Kind.DOCUMENT,
          definitions: [mergedOperation],
        };

        const mergedRaw = print(mergedDocument);

        mergedOperations.push({
          operationType: group[0].operationType,
          operationName: group[0].operationName,
          raw: mergedRaw,
        });
      } catch (error) {
        // If merging fails, keep the first operation from the group
        mergedOperations.push(group[0]);
      }
    }
  }

  return mergedOperations;
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

  // Use the new intelligent merging instead of simple deduplication
  const mergedOperations = mergeGraphQLQueries(allOperations);

  const queries = mergedOperations.filter((op) => op.operationType === 'query');
  const mutations = mergedOperations.filter((op) => op.operationType === 'mutation');

  const graphqlDir = path.join(outputDir, 'graphql');
  fs.mkdirSync(graphqlDir, { recursive: true });

  const queriesPath = path.join(graphqlDir, 'queries.ts');
  const mutationsPath = path.join(graphqlDir, 'mutations.ts');

  fs.writeFileSync(queriesPath, buildFileContent(queries), 'utf-8');
  fs.writeFileSync(mutationsPath, buildFileContent(mutations), 'utf-8');
}
