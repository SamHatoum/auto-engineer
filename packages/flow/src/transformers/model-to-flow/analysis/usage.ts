import ts from 'typescript';
import { extractFlowCode } from './extract-flow';
import { checkCallExpressionContext, processTypeMatching } from './lint-helpers';

function checkTypeReference(node: ts.Node, typeNames: string[], usedTypes: Set<string>): void {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const typeName = node.typeName.text;
    if (typeNames.includes(typeName)) {
      usedTypes.add(typeName);
    }
  }
}

function checkIdentifierReference(node: ts.Node, valueIntegrationNames: string[], usedIntegrations: Set<string>): void {
  if (ts.isIdentifier(node)) {
    const name = node.text;
    if (valueIntegrationNames.includes(name)) {
      usedIntegrations.add(name);
    }
  }
}

function checkCallExpressionTypes(node: ts.Node, typeNames: string[], usedTypes: Set<string>): void {
  if (ts.isCallExpression(node) && node.typeArguments) {
    for (const typeArg of node.typeArguments) {
      if (ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName)) {
        const typeName = typeArg.typeName.text;
        if (typeNames.includes(typeName)) {
          usedTypes.add(typeName);
        }
      }
    }
  }
}

function checkAsExpression(node: ts.Node, typeNames: string[], usedTypes: Set<string>): void {
  if (ts.isAsExpression(node) && ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName)) {
    const typeName = node.type.typeName.text;
    if (typeNames.includes(typeName)) {
      usedTypes.add(typeName);
    }
  }
}

function checkStringLiteralReferences(node: ts.Node, typeNames: string[], usedTypes: Set<string>): void {
  if (!ts.isStringLiteral(node) || node.parent === null || node.parent === undefined) {
    return;
  }

  const text = node.text;
  const isTypeReference = checkIfStringLiteralIsTypeReference(node.parent);

  if (isTypeReference) {
    processTypeMatching(text, typeNames, usedTypes);
  }
}

function checkIfStringLiteralIsTypeReference(parent: ts.Node): boolean {
  if (!ts.isCallExpression(parent)) {
    return false;
  }

  const contextResult = checkCallExpressionContext(parent);
  return contextResult !== null;
}

/**
 * Analyzes the flow code to find both used types and used integration names
 */
export function analyzeCodeUsage(
  code: string,
  typeNames: string[],
  _typeIntegrationNames: string[],
  valueIntegrationNames: string[],
) {
  const usedTypes = new Set<string>();
  const usedIntegrations = new Set<string>();

  // Extract only the flow code (exclude type declarations) for analysis
  const flowCode = extractFlowCode(code);

  // Create a temporary source file for flow code analysis
  const sourceFile = ts.createSourceFile('temp.ts', flowCode, ts.ScriptTarget.Latest, true);

  // Visit all nodes to find type and integration references in the flow code
  function visit(node: ts.Node): void {
    // Check for various type references
    checkTypeReference(node, typeNames, usedTypes);
    checkIdentifierReference(node, valueIntegrationNames, usedIntegrations);
    checkCallExpressionTypes(node, typeNames, usedTypes);
    checkAsExpression(node, typeNames, usedTypes);
    checkStringLiteralReferences(node, typeNames, usedTypes);

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { usedTypes, usedIntegrations };
}
