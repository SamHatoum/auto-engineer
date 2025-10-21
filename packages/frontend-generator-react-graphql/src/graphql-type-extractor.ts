import { parse, DocumentNode, ObjectTypeDefinitionNode, TypeNode } from 'graphql';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:graphql-type-extractor');

export interface TypeFieldInfo {
  fieldName: string;
  fieldType: string;
  isNullable: boolean;
}

export interface TypeMapping {
  queries: Map<string, string>;
  mutations: Map<string, string>;
  enums: Map<string, string[]>;
  types: Map<string, TypeFieldInfo[]>;
}

function unwrapType(type: TypeNode): string {
  if (type.kind === 'NonNullType') {
    return unwrapType(type.type);
  }
  if (type.kind === 'ListType') {
    return `${unwrapType(type.type)}[]`;
  }
  return type.name.value;
}

function unwrapTypeWithNullability(type: TypeNode): { typeName: string; isNullable: boolean } {
  if (type.kind === 'NonNullType') {
    const inner = unwrapTypeWithNullability(type.type);
    return { typeName: inner.typeName, isNullable: false };
  }
  if (type.kind === 'ListType') {
    const inner = unwrapTypeWithNullability(type.type);
    return { typeName: `${inner.typeName}[]`, isNullable: true };
  }
  return { typeName: type.name.value, isNullable: true };
}

function extractFieldMappings(node: ObjectTypeDefinitionNode): Map<string, string> {
  const mappings = new Map<string, string>();

  if (!node.fields) {
    return mappings;
  }

  for (const field of node.fields) {
    const fieldName = field.name.value;
    const returnType = unwrapType(field.type);
    mappings.set(fieldName, returnType);
    debug('Extracted %s field: %s -> %s', node.name.value, fieldName, returnType);
  }

  return mappings;
}

function extractTypeFields(node: ObjectTypeDefinitionNode): TypeFieldInfo[] {
  const fields: TypeFieldInfo[] = [];

  if (!node.fields) {
    return fields;
  }

  for (const field of node.fields) {
    const fieldName = field.name.value;
    const typeInfo = unwrapTypeWithNullability(field.type);

    fields.push({
      fieldName,
      fieldType: typeInfo.typeName,
      isNullable: typeInfo.isNullable,
    });

    debug(
      'Extracted type field for %s: %s: %s%s',
      node.name.value,
      fieldName,
      typeInfo.typeName,
      typeInfo.isNullable ? ' (nullable)' : '',
    );
  }

  return fields;
}

export function extractTypeMappings(schemaContent: string): TypeMapping {
  debug('Starting GraphQL schema parsing');

  const document: DocumentNode = parse(schemaContent);
  const queries = new Map<string, string>();
  const mutations = new Map<string, string>();
  const enums = new Map<string, string[]>();
  const types = new Map<string, TypeFieldInfo[]>();

  for (const definition of document.definitions) {
    if (definition.kind === 'ObjectTypeDefinition') {
      const typeName = definition.name.value;

      if (typeName === 'Query') {
        debug('Found Query type');
        const queryMappings = extractFieldMappings(definition);
        queryMappings.forEach((returnType, fieldName) => {
          queries.set(fieldName, returnType);
        });
      } else if (typeName === 'Mutation') {
        debug('Found Mutation type');
        const mutationMappings = extractFieldMappings(definition);
        mutationMappings.forEach((returnType, fieldName) => {
          mutations.set(fieldName, returnType);
        });
      } else {
        debug('Found type definition: %s', typeName);
        const typeFields = extractTypeFields(definition);
        types.set(typeName, typeFields);
      }
    } else if (definition.kind === 'EnumTypeDefinition') {
      const enumName = definition.name.value;
      const values = definition.values !== undefined ? definition.values.map((v) => v.name.value) : [];
      enums.set(enumName, values);
      debug('Found enum: %s with values: %s', enumName, values.join(', '));
    }
  }

  debug('Extracted %d queries, %d mutations, %d enums, %d types', queries.size, mutations.size, enums.size, types.size);
  return { queries, mutations, enums, types };
}

export function extractQueryFieldFromGQL(gqlString: string): string | null {
  try {
    const document = parse(gqlString);

    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition' && definition.operation === 'query') {
        const firstSelection = definition.selectionSet.selections[0];
        if (firstSelection !== undefined && firstSelection.kind === 'Field') {
          return firstSelection.name.value;
        }
      }
    }
  } catch (error) {
    debug('Failed to parse GQL query: %O', error);
  }

  return null;
}

export function extractMutationFieldFromGQL(gqlString: string): string | null {
  try {
    const document = parse(gqlString);

    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition' && definition.operation === 'mutation') {
        const firstSelection = definition.selectionSet.selections[0];
        if (firstSelection !== undefined && firstSelection.kind === 'Field') {
          return firstSelection.name.value;
        }
      }
    }
  } catch (error) {
    debug('Failed to parse GQL mutation: %O', error);
  }

  return null;
}

export function extractOperationNameFromGQL(gqlString: string): string | null {
  try {
    const document = parse(gqlString);

    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition') {
        if (definition.name !== undefined && definition.name.value !== '') {
          return definition.name.value;
        }
      }
    }
  } catch (error) {
    debug('Failed to parse GQL operation name: %O', error);
  }

  return null;
}
