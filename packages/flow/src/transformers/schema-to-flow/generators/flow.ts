import type tsNS from 'typescript';
import { jsonToExpr } from '../ast/emit-helpers';
import { buildGwtSpecBlock, type GWTBlock } from './gwt';

type Destination =
  | { type: 'stream'; pattern: string }
  | { type: 'integration'; systems: string[]; message?: { name: string; type: 'command' | 'query' | 'reaction' } }
  | { type: 'database'; collection: string }
  | { type: 'topic'; name: string };

type Origin =
  | { type: 'projection'; name: string; idField: string }
  | { type: 'readModel'; name: string }
  | { type: 'database'; collection: string; query?: unknown }
  | { type: 'api'; endpoint: string; method?: string }
  | { type: 'integration'; systems: string[] };

type DataSinkItem = {
  target: { type: 'Event' | 'Command' | 'State'; name: string };
  destination: Destination;
  transform?: string;
  _additionalInstructions?: string;
  _withState?: { target: { type: 'State'; name: string }; origin: Origin };
};

type DataSourceItem = {
  target: { type: 'State'; name: string };
  origin: Origin;
  transform?: string;
  _additionalInstructions?: string;
};

type CommandSlice = {
  type: 'command';
  name: string;
  client?: { description: string; specs: string[] };
  request?: string;
  server: { description: string; data?: DataSinkItem[]; gwt: GWTBlock[] };
};

type QuerySlice = {
  type: 'query';
  name: string;
  client?: { description: string; specs: string[] };
  request?: string;
  server: { description: string; data?: DataSourceItem[]; gwt: GWTBlock[] };
};

type ReactSlice = {
  type: 'react';
  name: string;
  server: { description?: string; data?: Array<DataSinkItem | DataSourceItem>; gwt: GWTBlock[] };
};

type Flow = {
  name: string;
  slices: Array<CommandSlice | QuerySlice | ReactSlice>;
};

function buildClientSpecs(ts: typeof import('typescript'), f: tsNS.NodeFactory, title: string, lines: string[]) {
  const shouldCalls = lines.map((txt) =>
    f.createExpressionStatement(
      f.createCallExpression(f.createIdentifier('should'), undefined, [f.createStringLiteral(txt)]),
    ),
  );

  return f.createExpressionStatement(
    f.createCallExpression(f.createIdentifier('specs'), undefined, [
      f.createStringLiteral(title),
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock(shouldCalls, true),
      ),
    ]),
  );
}

function buildInitialChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  target: { type: 'Event' | 'Command' | 'State'; name: string },
): tsNS.Expression {
  const op = target.type === 'Event' ? 'event' : target.type === 'Command' ? 'command' : 'state';
  return f.createCallExpression(
    f.createPropertyAccessExpression(
      target.type === 'State'
        ? f.createCallExpression(f.createIdentifier('source'), undefined, [])
        : f.createCallExpression(f.createIdentifier('sink'), undefined, []),
      ts.factory.createIdentifier(op),
    ),
    undefined,
    [f.createStringLiteral(target.name)],
  );
}

function addDestinationToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  destination: Destination,
): tsNS.Expression {
  switch (destination.type) {
    case 'stream':
      return f.createCallExpression(
        f.createPropertyAccessExpression(chain, f.createIdentifier('toStream')),
        undefined,
        [f.createStringLiteral(destination.pattern)],
      );
    case 'database':
      return f.createCallExpression(
        f.createPropertyAccessExpression(chain, f.createIdentifier('toDatabase')),
        undefined,
        [f.createStringLiteral(destination.collection)],
      );
    case 'topic':
      return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('toTopic')), undefined, [
        f.createStringLiteral(destination.name),
      ]);
    case 'integration': {
      const [system] = destination.systems;
      const args: tsNS.Expression[] = [f.createIdentifier(system)];
      if (destination.message) {
        args.push(f.createStringLiteral(destination.message.name));
        args.push(f.createStringLiteral(destination.message.type));
      }
      return f.createCallExpression(
        f.createPropertyAccessExpression(chain, f.createIdentifier('toIntegration')),
        undefined,
        args,
      );
    }
    default:
      return chain;
  }
}

function buildStateCall(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  origin: Origin,
  stateName: string,
): tsNS.Expression {
  const baseStateCall = f.createCallExpression(
    f.createPropertyAccessExpression(
      f.createCallExpression(f.createIdentifier('source'), undefined, []),
      f.createIdentifier('state'),
    ),
    undefined,
    [f.createStringLiteral(stateName)],
  );

  switch (origin.type) {
    case 'integration': {
      const [sys] = origin.systems;
      return f.createCallExpression(
        f.createPropertyAccessExpression(baseStateCall, f.createIdentifier('fromIntegration')),
        undefined,
        [f.createIdentifier(sys)],
      );
    }
    case 'projection':
      return f.createCallExpression(
        f.createPropertyAccessExpression(baseStateCall, f.createIdentifier('fromProjection')),
        undefined,
        [f.createStringLiteral(origin.name), f.createStringLiteral(origin.idField)],
      );
    case 'database': {
      const args: tsNS.Expression[] = [f.createStringLiteral(origin.collection)];
      if (origin.query !== null && origin.query !== undefined) {
        args.push(jsonToExpr(ts, f, origin.query));
      }
      return f.createCallExpression(
        f.createPropertyAccessExpression(baseStateCall, f.createIdentifier('fromDatabase')),
        undefined,
        args,
      );
    }
    case 'api': {
      const args: tsNS.Expression[] = [f.createStringLiteral(origin.endpoint)];
      if (origin.method !== null && origin.method !== undefined) {
        args.push(f.createStringLiteral(origin.method));
      }
      return f.createCallExpression(
        f.createPropertyAccessExpression(baseStateCall, f.createIdentifier('fromApi')),
        undefined,
        args,
      );
    }
    case 'readModel':
      return f.createCallExpression(
        f.createPropertyAccessExpression(baseStateCall, f.createIdentifier('fromReadModel')),
        undefined,
        [f.createStringLiteral(origin.name)],
      );
    default:
      return baseStateCall;
  }
}

function buildOriginArgs(ts: typeof import('typescript'), f: tsNS.NodeFactory, origin: Origin): tsNS.Expression[] {
  switch (origin.type) {
    case 'projection':
      return [f.createStringLiteral(origin.name), f.createStringLiteral(origin.idField)];
    case 'integration': {
      const [sys] = origin.systems;
      return [f.createIdentifier(sys)];
    }
    case 'database': {
      const args: tsNS.Expression[] = [f.createStringLiteral(origin.collection)];
      if (origin.query !== null && origin.query !== undefined) {
        args.push(jsonToExpr(ts, f, origin.query));
      }
      return args;
    }
    case 'api': {
      const args: tsNS.Expression[] = [f.createStringLiteral(origin.endpoint)];
      if (origin.method !== null && origin.method !== undefined) {
        args.push(f.createStringLiteral(origin.method));
      }
      return args;
    }
    case 'readModel':
      return [f.createStringLiteral(origin.name)];
    default:
      return [];
  }
}

function getOriginMethodName(origin: Origin): string {
  switch (origin.type) {
    case 'projection':
      return 'fromProjection';
    case 'integration':
      return 'fromIntegration';
    case 'database':
      return 'fromDatabase';
    case 'api':
      return 'fromApi';
    case 'readModel':
      return 'fromReadModel';
    default:
      return 'fromReadModel';
  }
}

function buildSingleDataItem(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  it: DataSinkItem | DataSourceItem,
): tsNS.Expression {
  let chain = buildInitialChain(ts, f, it.target);

  if ('destination' in it) {
    const sinkItem = it;
    chain = addDestinationToChain(ts, f, chain, sinkItem.destination);

    if (sinkItem._withState) {
      const stateCall = buildStateCall(ts, f, sinkItem._withState.origin, sinkItem._withState.target.name);
      chain = f.createCallExpression(
        f.createPropertyAccessExpression(chain, f.createIdentifier('withState')),
        undefined,
        [stateCall],
      );
    }

    if (sinkItem._additionalInstructions !== null && sinkItem._additionalInstructions !== undefined) {
      chain = f.createCallExpression(
        f.createPropertyAccessExpression(chain, f.createIdentifier('additionalInstructions')),
        undefined,
        [f.createStringLiteral(sinkItem._additionalInstructions)],
      );
    }
  } else if ('origin' in it) {
    const sourceItem = it;
    chain = f.createCallExpression(
      f.createPropertyAccessExpression(
        f.createCallExpression(
          f.createPropertyAccessExpression(
            f.createCallExpression(f.createIdentifier('source'), undefined, []),
            f.createIdentifier('state'),
          ),
          undefined,
          [f.createStringLiteral(sourceItem.target.name)],
        ),
        f.createIdentifier(getOriginMethodName(sourceItem.origin)),
      ),
      undefined,
      buildOriginArgs(ts, f, sourceItem.origin),
    );
  }

  return chain;
}

function buildDataItems(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  items: Array<DataSinkItem | DataSourceItem>,
) {
  const calls = items.map((it) => buildSingleDataItem(ts, f, it));

  return f.createExpressionStatement(
    f.createCallExpression(f.createIdentifier('data'), undefined, [f.createArrayLiteralExpression(calls, false)]),
  );
}

function addClientToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  slice: CommandSlice | QuerySlice | ReactSlice,
): tsNS.Expression {
  if ('client' in slice && slice.client !== null && slice.client !== undefined && slice.client.specs.length > 0) {
    return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('client')), undefined, [
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock([buildClientSpecs(ts, f, slice.client.description || slice.name, slice.client.specs)], true),
      ),
    ]);
  }
  return chain;
}

function addRequestToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  slice: CommandSlice | QuerySlice | ReactSlice,
): tsNS.Expression {
  if ('request' in slice && slice.request !== null && slice.request !== undefined) {
    const gqlTpl = f.createNoSubstitutionTemplateLiteral(slice.request);
    return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('request')), undefined, [
      f.createCallExpression(f.createIdentifier('gql'), undefined, [gqlTpl]),
    ]);
  }
  return chain;
}

function buildServerStatements(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  server: { data?: Array<DataSinkItem | DataSourceItem>; gwt: GWTBlock[] },
  sliceType: 'command' | 'query' | 'react',
): tsNS.Statement[] {
  const statements: tsNS.Statement[] = [];

  if (server.data !== null && server.data !== undefined && server.data.length > 0) {
    statements.push(buildDataItems(ts, f, server.data));
  }

  if (server.gwt !== null && server.gwt !== undefined && server.gwt.length > 0) {
    for (const gwt of server.gwt) {
      statements.push(buildGwtSpecBlock(ts, f, gwt, sliceType));
    }
  }

  return statements;
}

function addServerToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  slice: CommandSlice | QuerySlice | ReactSlice,
): tsNS.Expression {
  if ('server' in slice && slice.server !== null && slice.server !== undefined) {
    const serverStatements = buildServerStatements(ts, f, slice.server, slice.type);

    return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('server')), undefined, [
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock(serverStatements, true),
      ),
    ]);
  }
  return chain;
}

function buildSlice(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  slice: CommandSlice | QuerySlice | ReactSlice,
): tsNS.Statement {
  const sliceCtor = slice.type === 'command' ? 'commandSlice' : slice.type === 'query' ? 'querySlice' : 'reactSlice';

  let chain: tsNS.Expression = f.createCallExpression(f.createIdentifier(sliceCtor), undefined, [
    f.createStringLiteral(slice.name),
  ]);

  chain = addClientToChain(ts, f, chain, slice);
  chain = addRequestToChain(ts, f, chain, slice);
  chain = addServerToChain(ts, f, chain, slice);

  return f.createExpressionStatement(chain);
}

export function buildFlowStatements(ts: typeof import('typescript'), flow: Flow): tsNS.Statement[] {
  const f = ts.factory;

  const body = (flow.slices ?? []).map((sl) => buildSlice(ts, f, sl));

  const flowExpr = f.createCallExpression(f.createIdentifier('flow'), undefined, [
    f.createStringLiteral(flow.name),
    f.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createBlock(body, true),
    ),
  ]);

  return [f.createExpressionStatement(flowExpr)];
}
