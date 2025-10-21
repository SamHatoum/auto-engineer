import { MoleculeSpec, OrganismSpec, PageSpec, DataRequirement, IAScheme } from '../types';
import {
  TypeMapping,
  extractQueryFieldFromGQL,
  extractMutationFieldFromGQL,
  extractOperationNameFromGQL,
} from '../graphql-type-extractor';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:type-guidance-builder');

export interface TypeGuidance {
  imports: string[];
  queryGuidance: string[];
  mutationGuidance: string[];
  enumGuidance: string[];
  typeFieldGuidance: string[];
}

export function buildTypeGuidance(
  componentName: string,
  spec: MoleculeSpec | OrganismSpec | PageSpec,
  typeMappings: TypeMapping,
): TypeGuidance {
  const imports = new Set<string>();
  const queryGuidance: string[] = [];
  const mutationGuidance: string[] = [];
  const usedTypes = new Set<string>();
  const enumGuidance = buildEnumGuidance(typeMappings);

  if (!spec.data_requirements || spec.data_requirements.length === 0) {
    debug('%s has no data_requirements', componentName);
    return { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance, typeFieldGuidance: [] };
  }

  for (const requirement of spec.data_requirements) {
    if (requirement.type === 'query') {
      processQuery(requirement, typeMappings, imports, queryGuidance, usedTypes);
    } else if (requirement.type === 'mutation') {
      processMutation(requirement, typeMappings, imports, mutationGuidance);
    }
  }

  const typeFieldGuidance = buildTypeFieldGuidance(usedTypes, typeMappings);

  debug(
    '%s: extracted %d imports, %d query guidance, %d mutation guidance, %d enum guidance, %d type field guidance',
    componentName,
    imports.size,
    queryGuidance.length,
    mutationGuidance.length,
    enumGuidance.length,
    typeFieldGuidance.length,
  );

  return {
    imports: Array.from(imports),
    queryGuidance,
    mutationGuidance,
    enumGuidance,
    typeFieldGuidance,
  };
}

function buildEnumGuidance(typeMappings: TypeMapping): string[] {
  const enumGuidance: string[] = [];

  for (const [enumName, values] of typeMappings.enums.entries()) {
    const tsPascalCase = (val: string): string => {
      return val
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
    };

    const enumValues = values.map((val) => `  ${enumName}.${tsPascalCase(val)} = '${val}'`).join('\n');

    const guidance = [
      `Enum - ${enumName}:`,
      `  Import: import { ${enumName} } from '@/gql/graphql'`,
      `  Values:`,
      enumValues,
    ].join('\n');

    enumGuidance.push(guidance);
    debug('Enum: %s with %d values', enumName, values.length);
  }

  return enumGuidance;
}

function buildTypeFieldGuidance(usedTypes: Set<string>, typeMappings: TypeMapping): string[] {
  const typeFieldGuidance: string[] = [];

  for (const typeName of usedTypes) {
    const typeFields = typeMappings.types.get(typeName);

    if (!typeFields || typeFields.length === 0) {
      debug('No field information found for type: %s', typeName);
      continue;
    }

    const fieldsList = typeFields
      .map((field) => `    ${field.fieldName}: ${field.fieldType}${field.isNullable ? ' | null' : ''}`)
      .join('\n');

    const guidanceParts = [`Type - ${typeName}:`, `  Fields: {`, fieldsList, `  }`];

    const exampleField = typeFields.find((f) => f.fieldName.endsWith('Id')) || typeFields[0];
    if (exampleField !== undefined) {
      guidanceParts.push(`  Example: data?.items.map(item => item.${exampleField.fieldName})`);
    }

    const guidance = guidanceParts.join('\n');
    typeFieldGuidance.push(guidance);
    debug('Type field guidance: %s with %d fields', typeName, typeFields.length);
  }

  return typeFieldGuidance;
}

function processQuery(
  requirement: DataRequirement,
  typeMappings: TypeMapping,
  imports: Set<string>,
  queryGuidance: string[],
  usedTypes: Set<string>,
): void {
  const operationName = extractOperationNameFromGQL(requirement.details.gql);
  const fieldName = extractQueryFieldFromGQL(requirement.details.gql);

  if (fieldName === null || fieldName === '') {
    debug('Failed to extract query field from GQL: %s', requirement.details.gql);
    return;
  }

  const returnType = typeMappings.queries.get(fieldName);

  if (returnType === undefined || returnType === '') {
    debug('No type mapping found for query field: %s', fieldName);
    return;
  }

  const baseType = returnType.replace('[]', '');
  imports.add(baseType);
  usedTypes.add(baseType);

  const actualOperationName = operationName !== null && operationName !== '' ? operationName : fieldName;

  const guidance = [
    `Query - ${actualOperationName}:`,
    `  Import: import { ${actualOperationName} } from '@/graphql/queries'`,
    `  Returns: data?.${fieldName} → ${returnType}`,
    `  Usage: const { data } = useQuery(${actualOperationName})`,
  ].join('\n');

  queryGuidance.push(guidance);

  debug('Query: %s (operation: %s) -> %s', fieldName, actualOperationName, returnType);
}

function processMutation(
  requirement: DataRequirement,
  typeMappings: TypeMapping,
  imports: Set<string>,
  mutationGuidance: string[],
): void {
  const operationName = extractOperationNameFromGQL(requirement.details.gql);
  const fieldName = extractMutationFieldFromGQL(requirement.details.gql);

  if (fieldName === null || fieldName === '') {
    debug('Failed to extract mutation field from GQL: %s', requirement.details.gql);
    return;
  }

  const actualOperationName = operationName !== null && operationName !== '' ? operationName : fieldName;
  const inputTypeName = `${capitalize(actualOperationName)}MutationVariables`;
  imports.add(inputTypeName);

  const payloadSchema = requirement.details.payload_schema;
  let inputFields = '';

  if (payloadSchema !== null && payloadSchema !== undefined) {
    const fields = Object.entries(payloadSchema)
      .map(([key, type]) => `${key}: ${type}`)
      .join(', ');
    inputFields = ` { ${fields} }`;
  }

  const guidance = [
    `Mutation - ${actualOperationName}:`,
    `  Import: import { ${actualOperationName} } from '@/graphql/mutations'`,
    `  Variables: ${inputTypeName}`,
    `  Input:${inputFields}`,
    `  Usage: const [mutate] = useMutation(${actualOperationName})`,
    `  Call: mutate({ variables: { input: {...} } })`,
  ].join('\n');

  mutationGuidance.push(guidance);

  debug('Mutation: %s (operation: %s) -> %s', fieldName, actualOperationName, inputTypeName);
}

function addOperationGuidance(
  guidance: string,
  organismName: string,
  operationPattern: RegExp,
  seenOperations: Set<string>,
  guidanceArray: string[],
): void {
  const operationMatch = guidance.match(operationPattern);
  const operationName = operationMatch !== null ? operationMatch[1] : '';

  if (operationName === '') {
    return;
  }

  if (!seenOperations.has(operationName)) {
    seenOperations.add(operationName);
    guidanceArray.push(`${guidance}\n  Used by: ${organismName}`);
  } else {
    const existingIndex = guidanceArray.findIndex((g) =>
      g.includes(operationPattern.source.replace('([^:]+)', operationName)),
    );
    if (existingIndex !== -1) {
      guidanceArray[existingIndex] = guidanceArray[existingIndex].replace(
        /Used by: (.+)$/m,
        `Used by: $1, ${organismName}`,
      );
    }
  }
}

function processOrganismGuidance(
  organismName: string,
  iaScheme: IAScheme,
  typeMappings: TypeMapping,
  allImports: Set<string>,
  allQueryGuidance: string[],
  allMutationGuidance: string[],
  allTypeFieldGuidance: string[],
  seenOperations: Set<string>,
  seenTypes: Set<string>,
): void {
  const organismSpec = iaScheme.organisms.items[organismName];

  if (organismSpec === undefined) {
    debug('Organism %s not found in IA schema', organismName);
    return;
  }

  if (organismSpec.data_requirements === undefined || organismSpec.data_requirements.length === 0) {
    debug('Organism %s has no data_requirements', organismName);
    return;
  }

  const organismGuidance = buildTypeGuidance(organismName, organismSpec, typeMappings);

  for (const imp of organismGuidance.imports) {
    allImports.add(imp);
  }

  for (const queryGuide of organismGuidance.queryGuidance) {
    addOperationGuidance(queryGuide, organismName, /Query - ([^:]+):/, seenOperations, allQueryGuidance);
  }

  for (const mutationGuide of organismGuidance.mutationGuidance) {
    addOperationGuidance(mutationGuide, organismName, /Mutation - ([^:]+):/, seenOperations, allMutationGuidance);
  }

  aggregateTypeFieldGuidance(organismGuidance.typeFieldGuidance, seenTypes, allTypeFieldGuidance);
}

function aggregateTypeFieldGuidance(
  typeFieldGuidance: string[],
  seenTypes: Set<string>,
  allTypeFieldGuidance: string[],
): void {
  for (const typeGuide of typeFieldGuidance) {
    const typeMatch = typeGuide.match(/Type - ([^:]+):/);
    const typeName = typeMatch !== null ? typeMatch[1] : '';
    if (typeName !== '' && !seenTypes.has(typeName)) {
      seenTypes.add(typeName);
      allTypeFieldGuidance.push(typeGuide);
    }
  }
}

export function aggregateOrganismGuidance(
  pageName: string,
  pageSpec: PageSpec,
  iaScheme: IAScheme,
  typeMappings: TypeMapping,
): TypeGuidance {
  debug('Aggregating organism guidance for page: %s', pageName);

  const allImports = new Set<string>();
  const allQueryGuidance: string[] = [];
  const allMutationGuidance: string[] = [];
  const allTypeFieldGuidance: string[] = [];
  const allEnumGuidance = buildEnumGuidance(typeMappings);
  const seenOperations = new Set<string>();
  const seenTypes = new Set<string>();

  if (pageSpec.layout === undefined || pageSpec.layout.organisms === undefined) {
    debug('%s has no organisms in layout', pageName);
    return {
      imports: [],
      queryGuidance: [],
      mutationGuidance: [],
      enumGuidance: allEnumGuidance,
      typeFieldGuidance: [],
    };
  }

  for (const organismName of pageSpec.layout.organisms) {
    processOrganismGuidance(
      organismName,
      iaScheme,
      typeMappings,
      allImports,
      allQueryGuidance,
      allMutationGuidance,
      allTypeFieldGuidance,
      seenOperations,
      seenTypes,
    );
  }

  debug(
    '%s: aggregated %d imports, %d queries, %d mutations, %d enums, %d type field guidance from child organisms',
    pageName,
    allImports.size,
    allQueryGuidance.length,
    allMutationGuidance.length,
    allEnumGuidance.length,
    allTypeFieldGuidance.length,
  );

  return {
    imports: Array.from(allImports),
    queryGuidance: allQueryGuidance,
    mutationGuidance: allMutationGuidance,
    enumGuidance: allEnumGuidance,
    typeFieldGuidance: allTypeFieldGuidance,
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
