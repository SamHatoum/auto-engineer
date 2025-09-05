import tsNS from 'typescript';
import { jsonToExpr } from '../ast/emit-helpers';

/**
 * Build a single specs() block for a GWT entry, adapting to slice type:
 * - command: when(Command).then([Events|Error])
 * - react:   when([Events]).then([Commands])
 * - query:   given([Events]).then([State])
 */

// Narrowing helpers
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
    | Array<{ eventRef: string; exampleData: Record<string, unknown> }>;
  then: Array<
    | { eventRef: string; exampleData: Record<string, unknown> }
    | { commandRef: string; exampleData: Record<string, unknown> }
    | { stateRef: string; exampleData: Record<string, unknown> }
    | { errorType: 'IllegalStateError' | 'ValidationError' | 'NotFoundError'; message?: string }
  >;
};

function getSpecTitle(sliceKind: 'command' | 'react' | 'query'): string {
  if (sliceKind === 'command') return 'When command, then event(s)';
  if (sliceKind === 'react') return 'When event(s), then command(s)';
  return 'Given event(s), then state';
}

function buildGivenChain(ts: typeof import('typescript'), f: tsNS.NodeFactory, g: GWTBlock): tsNS.Expression | null {
  if (!hasGivenEvents(g) || g.given === null || g.given === undefined || g.given.length === 0) {
    return null;
  }

  const givenArr = f.createArrayLiteralExpression(
    g.given.map((ev) =>
      f.createCallExpression(
        f.createPropertyAccessExpression(f.createIdentifier('Events'), f.createIdentifier(ev.eventRef)),
        undefined,
        [jsonToExpr(ts, f, ev.exampleData)],
      ),
    ),
    true,
  );

  return f.createCallExpression(f.createIdentifier('given'), undefined, [givenArr]);
}

function buildWhenChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  g: GWTBlock,
  sliceKind: 'command' | 'react' | 'query',
): tsNS.Expression | null {
  if (sliceKind === 'command' && isWhenCommand(g.when)) {
    return f.createCallExpression(f.createIdentifier('when'), undefined, [
      f.createCallExpression(
        f.createPropertyAccessExpression(f.createIdentifier('Commands'), f.createIdentifier(g.when.commandRef)),
        undefined,
        [jsonToExpr(ts, f, g.when.exampleData)],
      ),
    ]);
  }

  if (sliceKind === 'react' && isWhenEvents(g.when)) {
    const whenArr = f.createArrayLiteralExpression(
      g.when.map((ev) =>
        f.createCallExpression(
          f.createPropertyAccessExpression(f.createIdentifier('Events'), f.createIdentifier(ev.eventRef)),
          undefined,
          [jsonToExpr(ts, f, ev.exampleData)],
        ),
      ),
      true,
    );
    return f.createCallExpression(f.createIdentifier('when'), undefined, [whenArr]);
  }

  return null;
}

function buildThenItems(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  g: GWTBlock,
  sliceKind: 'command' | 'react' | 'query',
): tsNS.Expression[] {
  if (sliceKind === 'command') {
    return g.then.map((t) => {
      const item = t as Record<string, unknown>;
      if ('eventRef' in item) {
        const e = t as { eventRef: string; exampleData: Record<string, unknown> };
        return f.createCallExpression(
          f.createPropertyAccessExpression(f.createIdentifier('Events'), f.createIdentifier(e.eventRef)),
          undefined,
          [jsonToExpr(ts, f, e.exampleData)],
        );
      }
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

  if (sliceKind === 'react') {
    return g.then
      .filter((t): t is { commandRef: string; exampleData: Record<string, unknown> } => {
        const item = t as Record<string, unknown>;
        return 'commandRef' in item;
      })
      .map((c) =>
        f.createCallExpression(
          f.createPropertyAccessExpression(f.createIdentifier('Commands'), f.createIdentifier(c.commandRef)),
          undefined,
          [jsonToExpr(ts, f, c.exampleData)],
        ),
      );
  }

  return g.then
    .filter((t): t is { stateRef: string; exampleData: Record<string, unknown> } => {
      const item = t as Record<string, unknown>;
      return 'stateRef' in item;
    })
    .map((s) =>
      f.createCallExpression(
        f.createPropertyAccessExpression(f.createIdentifier('State'), f.createIdentifier(s.stateRef)),
        undefined,
        [jsonToExpr(ts, f, s.exampleData)],
      ),
    );
}

export function buildGwtSpecBlock(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  g: GWTBlock,
  sliceKind: 'command' | 'react' | 'query',
): tsNS.Statement {
  const title = getSpecTitle(sliceKind);
  const chainParts: tsNS.Expression[] = [];

  const givenChain = buildGivenChain(ts, f, g);
  if (givenChain !== null) {
    chainParts.push(givenChain);
  }

  const whenChain = buildWhenChain(ts, f, g, sliceKind);
  if (whenChain !== null) {
    chainParts.push(whenChain);
  }

  const thenItems = buildThenItems(ts, f, g, sliceKind);

  const head =
    chainParts.length === 0
      ? f.createCallExpression(f.createIdentifier('given'), undefined, [f.createArrayLiteralExpression([], false)])
      : chainParts[0];

  const tail = chainParts.length > 1 ? chainParts[chainParts.length - 1] : head;

  const finalThen = f.createCallExpression(f.createPropertyAccessExpression(tail, 'then'), undefined, [
    f.createArrayLiteralExpression(thenItems, true),
  ]);

  return f.createExpressionStatement(
    f.createCallExpression(f.createIdentifier('specs'), undefined, [
      f.createStringLiteral(title),
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock([f.createExpressionStatement(finalThen)], true),
      ),
    ]),
  );
}
