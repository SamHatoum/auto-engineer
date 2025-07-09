import { parse, OperationDefinitionNode, TypeNode } from 'graphql';

export interface ParsedArg {
    name: string;
    tsType: string;
    graphqlType: string;
    nullable: boolean;
}

export interface ParsedGraphQlQuery {
    queryName: string;
    args: ParsedArg[];
    returnType: string;
    tsReturnType: string;
}

function getTypeName(typeNode: TypeNode): { graphqlType: string; nullable: boolean } {
    if (typeNode.kind === 'NamedType') {
        return { graphqlType: typeNode.name.value, nullable: true };
    } else if (typeNode.kind === 'NonNullType') {
        const inner = getTypeName(typeNode.type);
        return { ...inner, nullable: false };
    } else {
        return getTypeName(typeNode.type);
    }
}

function graphqlToTs(type: string): string {
    switch (type) {
        case 'String':
            return 'string';
        case 'Int':
        case 'Float':
        case 'Number':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'Date':
            return 'Date';
        default:
            return type;
    }
}

export function parseGraphQlRequest(request: string): ParsedGraphQlQuery {
    const ast = parse(request);
    const op = ast.definitions.find(
        (d): d is OperationDefinitionNode =>
            d.kind === 'OperationDefinition' && d.operation === 'query'
    );

    if (!op) throw new Error('No query operation found');

    const queryName = op.name?.value;
    if (queryName == null) throw new Error('Query must have a name');

    const args: ParsedArg[] = (op.variableDefinitions ?? []).map((def) => {
        const varName = def.variable.name.value;
        const { graphqlType, nullable } = getTypeName(def.type);
        return {
            name: varName,
            graphqlType,
            tsType: graphqlToTs(graphqlType),
            nullable,
        };
    });

    const field = op.selectionSet.selections[0];
    if (field?.kind !== 'Field' || !field.name.value) {
        throw new Error('Query selection must be a field');
    }

    const baseName = field.name.value;
    const returnType = pascalCase(baseName) + 'View';

    return {
        queryName: baseName,
        args,
        returnType,
        tsReturnType: `${returnType}[]`,
    };
}

function pascalCase(input: string): string {
    return input
        .replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase());
}