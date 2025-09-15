import tsNS from 'typescript';
import { jsonToExpr } from '../ast/emit-helpers';

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

function buildThenItems(ts: typeof import('typescript'), f: tsNS.NodeFactory, g: GWTBlock): tsNS.Expression[] {
  return g.then.map((t) => {
    const item = t as Record<string, unknown>;

    // Handle event references: just return the data (type handled by generic parameter)
    if ('eventRef' in item) {
      const e = t as { eventRef: string; exampleData: Record<string, unknown> };
      return jsonToExpr(ts, f, e.exampleData);
    }

    // Handle command references: just return the data (type handled by generic parameter)
    if ('commandRef' in item) {
      const c = t as { commandRef: string; exampleData: Record<string, unknown> };
      return jsonToExpr(ts, f, c.exampleData);
    }

    // Handle state references: just return the data (type handled by generic parameter)
    if ('stateRef' in item) {
      const s = t as { stateRef: string; exampleData: Record<string, unknown> };
      return jsonToExpr(ts, f, s.exampleData);
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
): tsNS.Expression {
  if (hasGivenEvents(g) && g.given !== null && g.given !== undefined && g.given.length > 0) {
    const ev = g.given[0];
    return f.createCallExpression(
      f.createPropertyAccessExpression(exampleChain, 'given'),
      [f.createTypeReferenceNode(ev.eventRef, undefined)],
      [jsonToExpr(ts, f, ev.exampleData)],
    );
  }
  return exampleChain;
}

function addCommandWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  when: { commandRef: string; exampleData: Record<string, unknown> },
): tsNS.Expression {
  return f.createCallExpression(
    f.createPropertyAccessExpression(exampleChain, 'when'),
    [f.createTypeReferenceNode(when.commandRef, undefined)],
    [jsonToExpr(ts, f, when.exampleData)],
  );
}

function addEventWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  firstEvent: { eventRef: string; exampleData: Record<string, unknown> },
): tsNS.Expression {
  return f.createCallExpression(
    f.createPropertyAccessExpression(exampleChain, 'when'),
    [f.createTypeReferenceNode(firstEvent.eventRef, undefined)],
    [jsonToExpr(ts, f, firstEvent.exampleData)],
  );
}

function addWhenToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  exampleChain: tsNS.Expression,
  g: GWTBlock,
  sliceKind: 'command' | 'react' | 'query' | 'experience',
): tsNS.Expression {
  if (sliceKind === 'command' && isWhenCommand(g.when)) {
    return addCommandWhenToChain(ts, f, exampleChain, g.when);
  } else if ((sliceKind === 'react' || sliceKind === 'query') && isWhenEvents(g.when)) {
    const firstWhenEvent = g.when[0];
    return addEventWhenToChain(ts, f, exampleChain, firstWhenEvent);
  } else if (sliceKind === 'query' && g.when && !Array.isArray(g.when) && 'eventRef' in g.when) {
    const whenEvent = g.when as { eventRef: string; exampleData: Record<string, unknown> };
    return addEventWhenToChain(ts, f, exampleChain, whenEvent);
  }
  return exampleChain;
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
): tsNS.Expression {
  const thenItems = buildThenItems(ts, f, g);
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
  g: GWTBlock & { description?: string; ruleDescription?: string; exampleDescription?: string },
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
  const ruleCall = f.createCallExpression(f.createIdentifier('rule'), undefined, [
    f.createStringLiteral(ruleDesc),
    f.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createBlock([f.createExpressionStatement(exampleChain)], true),
    ),
  ]);

  // Return just the rule() call - the specs() wrapper is handled by the flow generator
  return f.createExpressionStatement(ruleCall);
}
