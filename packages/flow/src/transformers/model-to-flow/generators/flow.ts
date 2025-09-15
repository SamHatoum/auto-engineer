import type tsNS from 'typescript';
import type { z } from 'zod';
import { jsonToExpr } from '../ast/emit-helpers';
import { buildGwtSpecBlock, type GWTBlock } from './gwt';
import {
  CommandSliceSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  ExperienceSliceSchema,
  ExampleSchema,
  FlowSchema,
  DataSinkSchema,
  DataSourceSchema,
  DestinationSchema,
  OriginSchema,
} from '../../../schema';

type CommandSlice = z.infer<typeof CommandSliceSchema>;
type QuerySlice = z.infer<typeof QuerySliceSchema>;
type ReactSlice = z.infer<typeof ReactSliceSchema>;
type ExperienceSlice = z.infer<typeof ExperienceSliceSchema>;
type Example = z.infer<typeof ExampleSchema>;
type Flow = z.infer<typeof FlowSchema>;
type DataSinkItem = z.infer<typeof DataSinkSchema>;
type DataSourceItem = z.infer<typeof DataSourceSchema>;
type Destination = z.infer<typeof DestinationSchema>;
type Origin = z.infer<typeof OriginSchema>;

function buildClientSpecs(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  specs: { name: string; rules: string[] },
) {
  const shouldCalls = specs.rules.map((txt) =>
    f.createExpressionStatement(
      f.createCallExpression(f.createIdentifier('should'), undefined, [f.createStringLiteral(txt)]),
    ),
  );

  return f.createExpressionStatement(
    f.createCallExpression(f.createIdentifier('specs'), undefined, [
      f.createStringLiteral(specs.name),
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
  target: DataSinkItem['target'] | DataSourceItem['target'],
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

function addDestinationToChain(f: tsNS.NodeFactory, chain: tsNS.Expression, destination: Destination): tsNS.Expression {
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
    chain = addDestinationToChain(f, chain, sinkItem.destination);

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
  slice: CommandSlice | QuerySlice | ReactSlice | ExperienceSlice,
): tsNS.Expression {
  if ('client' in slice && slice.client !== null && slice.client !== undefined && slice.client.specs) {
    return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('client')), undefined, [
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock([buildClientSpecs(ts, f, slice.client.specs)], true),
      ),
    ]);
  }
  return chain;
}

function addRequestToChain(
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  slice: CommandSlice | QuerySlice | ReactSlice | ExperienceSlice,
): tsNS.Expression {
  if ('request' in slice && slice.request !== null && slice.request !== undefined) {
    const gqlTpl = f.createNoSubstitutionTemplateLiteral(slice.request);
    return f.createCallExpression(f.createPropertyAccessExpression(chain, f.createIdentifier('request')), undefined, [
      f.createCallExpression(f.createIdentifier('gql'), undefined, [gqlTpl]),
    ]);
  }
  return chain;
}

/**
 * Convert schema example structure to GWT format expected by buildGwtSpecBlock
 */
function convertExampleToGWT(example: Example, _sliceType: 'command' | 'query' | 'react' | 'experience'): GWTBlock {
  const gwtBlock: GWTBlock = {
    then: [],
  };

  // Add description metadata
  (gwtBlock as { description?: string }).description = example.description;

  // Convert given
  if (example.given) {
    gwtBlock.given = example.given.map((given) => {
      if ('stateRef' in given) {
        return { eventRef: given.stateRef, exampleData: given.exampleData };
      } else if ('eventRef' in given) {
        return { eventRef: given.eventRef, exampleData: given.exampleData };
      }
      return given;
    });
  }

  // Convert when
  if (example.when !== null && example.when !== undefined) {
    if (Array.isArray(example.when)) {
      // Array of events for react slices
      gwtBlock.when = example.when.map((when) => {
        if ('eventRef' in when) {
          return { eventRef: when.eventRef, exampleData: when.exampleData };
        } else if ('commandRef' in when) {
          return { commandRef: when.commandRef, exampleData: when.exampleData };
        }
        return when;
      });
    } else {
      // Single object - could be command (command slices) or event (query slices)
      if ('commandRef' in example.when) {
        // Command for command slices
        gwtBlock.when = {
          commandRef: example.when.commandRef,
          exampleData: example.when.exampleData,
        };
      } else if ('eventRef' in example.when) {
        // Event for query slices
        gwtBlock.when = {
          eventRef: example.when.eventRef,
          exampleData: example.when.exampleData,
        };
      }
    }
  }

  // Convert then
  gwtBlock.then = example.then.map((then) => {
    if ('eventRef' in then) {
      return { eventRef: then.eventRef, exampleData: then.exampleData };
    } else if ('commandRef' in then) {
      return { commandRef: then.commandRef, exampleData: then.exampleData };
    } else if ('stateRef' in then) {
      return { stateRef: then.stateRef, exampleData: then.exampleData };
    } else {
      // Error case - return as-is
      return then;
    }
  });

  return gwtBlock;
}

function buildServerStatements(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  server: CommandSlice['server'] | QuerySlice['server'] | ReactSlice['server'],
  sliceType: 'command' | 'query' | 'react' | 'experience',
): tsNS.Statement[] {
  const statements: tsNS.Statement[] = [];

  if (server.data !== null && server.data !== undefined && server.data.length > 0) {
    statements.push(buildDataItems(ts, f, server.data as Array<DataSinkItem | DataSourceItem>));
  }

  // Handle server.specs structure from schema
  if (server.specs !== null && server.specs !== undefined) {
    // Create the outer specs() block
    const allRuleStatements: tsNS.Statement[] = [];

    for (const rule of server.specs.rules) {
      for (const example of rule.examples) {
        const gwtBlock = convertExampleToGWT(example, sliceType);
        // Add metadata to the GWT block, including the rule ID
        (gwtBlock as { ruleDescription?: string; exampleDescription?: string; ruleId?: string }).ruleDescription =
          rule.description;
        (gwtBlock as { ruleDescription?: string; exampleDescription?: string; ruleId?: string }).exampleDescription =
          example.description;
        (gwtBlock as { ruleDescription?: string; exampleDescription?: string; ruleId?: string }).ruleId = rule.id;

        // buildGwtSpecBlock already creates the rule() call with the ID, so we don't wrap it again
        allRuleStatements.push(buildGwtSpecBlock(ts, f, gwtBlock, sliceType));
      }
    }

    // Wrap all rules in a single specs() block
    if (allRuleStatements.length > 0) {
      const specsStatement = f.createExpressionStatement(
        f.createCallExpression(f.createIdentifier('specs'), undefined, [
          f.createStringLiteral(server.specs.name),
          f.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            f.createBlock(allRuleStatements, true),
          ),
        ]),
      );
      statements.push(specsStatement);
    }
  }

  return statements;
}

function addServerToChain(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  chain: tsNS.Expression,
  slice: CommandSlice | QuerySlice | ReactSlice | ExperienceSlice,
): tsNS.Expression {
  if ('server' in slice && slice.server !== null && slice.server !== undefined) {
    const sliceType = slice.type as 'command' | 'query' | 'react' | 'experience';
    const serverStatements = buildServerStatements(
      ts,
      f,
      slice.server,
      sliceType === 'experience' ? 'react' : sliceType,
    );

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
  slice: CommandSlice | QuerySlice | ReactSlice | ExperienceSlice,
): tsNS.Statement {
  const sliceCtor =
    slice.type === 'command'
      ? 'command'
      : slice.type === 'query'
        ? 'query'
        : slice.type === 'experience'
          ? 'experience'
          : 'react';

  const args: tsNS.Expression[] = [f.createStringLiteral(slice.name)];
  if (slice.id !== null && slice.id !== undefined) {
    args.push(f.createStringLiteral(slice.id));
  }

  let chain: tsNS.Expression = f.createCallExpression(f.createIdentifier(sliceCtor), undefined, args);

  chain = addClientToChain(ts, f, chain, slice);
  chain = addRequestToChain(f, chain, slice);
  chain = addServerToChain(ts, f, chain, slice);

  return f.createExpressionStatement(chain);
}

export function buildFlowStatements(ts: typeof import('typescript'), flow: Flow): tsNS.Statement[] {
  const f = ts.factory;

  const body = (flow.slices ?? []).map((sl) => buildSlice(ts, f, sl));

  const flowArgs: tsNS.Expression[] = [f.createStringLiteral(flow.name)];
  if (flow.id !== null && flow.id !== undefined) {
    flowArgs.push(f.createStringLiteral(flow.id));
  }
  flowArgs.push(
    f.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      f.createBlock(body, true),
    ),
  );

  const flowExpr = f.createCallExpression(f.createIdentifier('flow'), undefined, flowArgs);

  return [f.createExpressionStatement(flowExpr)];
}
