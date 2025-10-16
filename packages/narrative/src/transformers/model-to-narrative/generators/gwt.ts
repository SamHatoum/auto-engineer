import tsNS from 'typescript';
import { jsonToExpr, type FieldTypeInfo } from '../ast/emit-helpers';

/**
 * Build a single specs() block for a GWT entry, adapting to slice type:
 * - command: when(Command).then([Events|Error])
 * - react:   when([Events]).then([Commands])
 * - query:   given([Events]).then([State])
 */

function isWhenCommand(x: unknown): x is { commandRef: string; exampleData: Record<string, unknown> } {
  return x !== null && x !== undefined && typeof x === 'object' && 'commandRef' in (x as Record<string, unknown>);
}
function isWhenEvents(x: unknown): x is Array<{ eventRef: string; exampleData: Record<string, unknown> }> {
  return Array.isArray(x);
}
function hasGivenEvents(x: unknown): x is { given: Array<{ eventRef: string; exampleData: Record<string, unknown> }> } {
  return x !== null && x !== undefined && typeof x === 'object' && Array.isArray((x as Record<string, unknown>).given);
}

export type GWTBlock = {
  given?: Array<{ eventRef: string; exampleData: Record<string, unknown> }>;
  when?:
    | { commandRef: string; exampleData: Record<string, unknown> }
    | { eventRef: string; exampleData: Record<string, unknown> }
    | Array<
        | { commandRef: string; exampleData: Record<string, unknown> }
        | { eventRef: string; exampleData: Record<string, unknown> }
      >;
  then: Array<
    | { eventRef: string; exampleData: Record<string, unknown> }
    | { commandRef: string; exampleData: Record<string, unknown> }
    | { stateRef: string; exampleData: Record<string, unknown> }
    | { errorType: 'IllegalStateError' | 'ValidationError' | 'NotFoundError'; message?: string }
  >;
};

function buildThenItems(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  g: GWTBlock,
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression[] {
  return g.then.map((t) => {
    const item = t as Record<string, unknown>;

    // Handle event references: just return the data (type handled by generic parameter)
    if ('eventRef' in item) {
      const e = t as { eventRef: string; exampleData: Record<string, unknown> };
      const typeInfo = messages ? getFieldTypeInfo(messages, e.eventRef) : undefined;
      return jsonToExpr(ts, f, e.exampleData, typeInfo);
    }

    // Handle command references: just return the data (type handled by generic parameter)
    if ('commandRef' in item) {
      const c = t as { commandRef: string; exampleData: Record<string, unknown> };
      const typeInfo = messages ? getFieldTypeInfo(messages, c.commandRef) : undefined;
      return jsonToExpr(ts, f, c.exampleData, typeInfo);
    }

    // Handle state references: just return the data (type handled by generic parameter)
    if ('stateRef' in item) {
      const s = t as { stateRef: string; exampleData: Record<string, unknown> };
      const typeInfo = messages ? getFieldTypeInfo(messages, s.stateRef) : undefined;
      return jsonToExpr(ts, f, s.exampleData, typeInfo);
    }

    // Handle error objects: { errorType: 'ValidationError', message: '...' }
    if ('errorType' in item) {
      const err = t as { errorType: 'IllegalStateError' | 'ValidationError' | 'NotFoundError'; message?: string };
      return f.createObjectLiteralExpression(
        [
          f.createPropertyAssignment('errorType', f.createStringLiteral(err.errorType)),
          ...(err.message !== null && err.message !== undefined
            ? [f.createPropertyAssignment('message', f.createStringLiteral(err.message))]
            : []),
        ],
        false,
      );
    }

    return f.createNull();
  });
}

function getDescriptions(
  g: GWTBlock & { description?: string; ruleDescription?: string; exampleDescription?: string },
) {
  const ruleDesc =
    g.ruleDescription !== null && g.ruleDescription !== undefined && g.ruleDescription !== ''
      ? g.ruleDescription
      : 'Generated rule description';

  const exampleDesc =
    g.exampleDescription !== null && g.exampleDescription !== undefined && g.exampleDescription !== ''
      ? g.exampleDescription
      : g.description !== null && g.description !== undefined && g.description !== ''
        ? g.description
        : 'Generated example description';

  return { ruleDesc, exampleDesc };
}

function addGivenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  g: GWTBlock,
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  if (hasGivenEvents(g) && g.given !== null && g.given !== undefined && g.given.length > 0) {
    // Start with the first given
    const firstGiven = g.given[0];
    const firstTypeInfo = messages ? getFieldTypeInfo(messages, firstGiven.eventRef) : undefined;
    let currentChain = f.createCallExpression(
      f.createPropertyAccessExpression(exampleChain, 'given'),
      [f.createTypeReferenceNode(firstGiven.eventRef, undefined)],
      [jsonToExpr(ts, f, firstGiven.exampleData, firstTypeInfo)],
    );

    // Chain additional givens with .and()
    for (let i = 1; i < g.given.length; i++) {
      const givenEvent = g.given[i];
      const typeInfo = messages ? getFieldTypeInfo(messages, givenEvent.eventRef) : undefined;
      currentChain = f.createCallExpression(
        f.createPropertyAccessExpression(currentChain, 'and'),
        [f.createTypeReferenceNode(givenEvent.eventRef, undefined)],
        [jsonToExpr(ts, f, givenEvent.exampleData, typeInfo)],
      );
    }

    return currentChain;
  }
  return exampleChain;
}

function addCommandWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  when: { commandRef: string; exampleData: Record<string, unknown> },
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  const typeInfo = messages ? getFieldTypeInfo(messages, when.commandRef) : undefined;
  return f.createCallExpression(
    f.createPropertyAccessExpression(exampleChain, 'when'),
    when.commandRef ? [f.createTypeReferenceNode(when.commandRef, undefined)] : undefined,
    [jsonToExpr(ts, f, when.exampleData, typeInfo)],
  );
}

function addEventWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  firstEvent: { eventRef: string; exampleData: Record<string, unknown> },
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  const typeInfo = messages ? getFieldTypeInfo(messages, firstEvent.eventRef) : undefined;
  return f.createCallExpression(
    f.createPropertyAccessExpression(exampleChain, 'when'),
    firstEvent.eventRef ? [f.createTypeReferenceNode(firstEvent.eventRef, undefined)] : undefined,
    [jsonToExpr(ts, f, firstEvent.exampleData, typeInfo)],
  );
}

function isEmptyEventWhen(when: { eventRef: string; exampleData: Record<string, unknown> }): boolean {
  return (!when.eventRef || when.eventRef === '') && Object.keys(when.exampleData).length === 0;
}

function isEmptyCommandWhen(when: { commandRef: string; exampleData: Record<string, unknown> }): boolean {
  return (!when.commandRef || when.commandRef === '') && Object.keys(when.exampleData).length === 0;
}

function isEmptyWhen(whenData: GWTBlock['when']): boolean {
  if (!whenData) return true;
  if (Array.isArray(whenData) && whenData.length === 0) return true;
  if (typeof whenData === 'object' && 'eventRef' in whenData) {
    return isEmptyEventWhen(whenData as { eventRef: string; exampleData: Record<string, unknown> });
  }
  if (typeof whenData === 'object' && 'commandRef' in whenData) {
    return isEmptyCommandWhen(whenData as { commandRef: string; exampleData: Record<string, unknown> });
  }
  return false;
}

function processWhenForSliceKind(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  when: GWTBlock['when'],
  sliceKind: 'command' | 'react' | 'query' | 'experience',
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  if (sliceKind === 'command' && isWhenCommand(when)) {
    return addCommandWhenToChain(ts, f, exampleChain, when, messages);
  }
  if ((sliceKind === 'react' || sliceKind === 'query') && isWhenEvents(when)) {
    return addEventWhenToChain(ts, f, exampleChain, when[0], messages);
  }
  if (sliceKind === 'query' && when && !Array.isArray(when) && 'eventRef' in when) {
    const whenEvent = when as { eventRef: string; exampleData: Record<string, unknown> };
    return addEventWhenToChain(ts, f, exampleChain, whenEvent, messages);
  }
  return exampleChain;
}

function addWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  g: GWTBlock,
  sliceKind: 'command' | 'react' | 'query' | 'experience',
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  if (isEmptyWhen(g.when)) {
    return exampleChain;
  }
  return processWhenForSliceKind(ts, f, exampleChain, g.when, sliceKind, messages);
}

function getThenTypeRef(firstThenItem: GWTBlock['then'][0]): string {
  if ('eventRef' in firstThenItem) {
    return (firstThenItem as { eventRef: string }).eventRef;
  } else if ('commandRef' in firstThenItem) {
    return (firstThenItem as { commandRef: string }).commandRef;
  } else if ('stateRef' in firstThenItem) {
    return (firstThenItem as { stateRef: string }).stateRef;
  }
  return '';
}

function addThenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  g: GWTBlock,
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Expression {
  const thenItems = buildThenItems(ts, f, g, messages);
  const firstThenItem = g.then[0];
  const thenTypeRef = getThenTypeRef(firstThenItem);

  // Always use single object format for .then()
  const thenArg = thenItems[0];
  const thenTypeParams = thenTypeRef ? [f.createTypeReferenceNode(thenTypeRef, undefined)] : undefined;

  return f.createCallExpression(f.createPropertyAccessExpression(exampleChain, 'then'), thenTypeParams, [thenArg]);
}

export function buildGwtSpecBlock(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  g: GWTBlock & { description?: string; ruleDescription?: string; exampleDescription?: string; ruleId?: string },
  sliceKind: 'command' | 'react' | 'query' | 'experience',
): tsNS.Statement {
  const { ruleDesc, exampleDesc } = getDescriptions(g);

  // Build the example chain: example('desc').given().when().then()
  let exampleChain: tsNS.Expression = f.createCallExpression(f.createIdentifier('example'), undefined, [
    f.createStringLiteral(exampleDesc),
  ]);

  // Add .given() if present
  exampleChain = addGivenToChain(ts, f, exampleChain, g);

  // Add .when()
  exampleChain = addWhenToChain(ts, f, exampleChain, g, sliceKind);

  // Add .then()
  exampleChain = addThenToChain(ts, f, exampleChain, g);

  // Create the rule() call containing the example
  const ruleArgs: tsNS.Expression[] = [f.createStringLiteral(ruleDesc)];

  // Add rule ID if provided
  if (g.ruleId !== null && g.ruleId !== undefined) {
    ruleArgs.push(f.createStringLiteral(g.ruleId));
  }

  ruleArgs.push(
    f.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createBlock([f.createExpressionStatement(exampleChain)], true),
    ),
  );

  const ruleCall = f.createCallExpression(f.createIdentifier('rule'), undefined, ruleArgs);
  return f.createExpressionStatement(ruleCall);
}

/**
 * Build a rule() call that contains multiple examples
 */
/**
 * Extract field type information from messages for a specific type
 */
function getFieldTypeInfo(
  messages: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
  typeName: string,
): FieldTypeInfo {
  const message = messages.find((msg) => msg.name === typeName);
  if (!message) return {};

  const typeInfo: FieldTypeInfo = {};
  for (const field of message.fields) {
    typeInfo[field.name] = field.type;
  }
  return typeInfo;
}

export function buildConsolidatedGwtSpecBlock(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  rule: { id?: string; description: string },
  gwtBlocks: Array<
    GWTBlock & { description?: string; ruleDescription?: string; exampleDescription?: string; ruleId?: string }
  >,
  sliceKind: 'command' | 'react' | 'query' | 'experience',
  messages?: Array<{ type: string; name: string; fields: Array<{ name: string; type: string; required: boolean }> }>,
): tsNS.Statement {
  // Build example chains for each GWT block
  const exampleStatements: tsNS.Statement[] = [];

  for (const g of gwtBlocks) {
    const { exampleDesc } = getDescriptions(g);

    // Build the example chain: example('desc').given().when().then()
    let exampleChain: tsNS.Expression = f.createCallExpression(f.createIdentifier('example'), undefined, [
      f.createStringLiteral(exampleDesc),
    ]);

    // Add .given() if present
    exampleChain = addGivenToChain(ts, f, exampleChain, g, messages);

    // Add .when()
    exampleChain = addWhenToChain(ts, f, exampleChain, g, sliceKind, messages);

    // Add .then()
    exampleChain = addThenToChain(ts, f, exampleChain, g, messages);

    exampleStatements.push(f.createExpressionStatement(exampleChain));
  }

  // Create the rule() call containing all examples
  const ruleArgs: tsNS.Expression[] = [f.createStringLiteral(rule.description)];

  // Add rule ID if provided
  if (rule.id !== null && rule.id !== undefined) {
    ruleArgs.push(f.createStringLiteral(rule.id));
  }

  ruleArgs.push(
    f.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createBlock(exampleStatements, true),
    ),
  );

  const ruleCall = f.createCallExpression(f.createIdentifier('rule'), undefined, ruleArgs);
  return f.createExpressionStatement(ruleCall);
}
