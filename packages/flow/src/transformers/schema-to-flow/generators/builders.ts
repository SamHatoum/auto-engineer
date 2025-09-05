import tsNS from 'typescript';

/**
 * events/commands/state generic arguments builder:
 * const { Events, Commands, State } = createBuilders()
 *   .events<E1 | E2 | ...>()
 *   .commands<C1 | C2 | ...>()
 *   .state<{ S1: S1['data']; S2: S2['data']; }>();
 */
function toUnionType(ts: typeof import('typescript'), f: tsNS.NodeFactory, names: string[]): tsNS.TypeNode {
  if (names.length === 0) return f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
  if (names.length === 1) return f.createTypeReferenceNode(names[0]);
  return f.createUnionTypeNode(names.map((n) => f.createTypeReferenceNode(n)));
}

export function buildCreateBuildersDecl(
  ts: typeof import('typescript'),
  events: string[],
  commands: string[],
  states: string[],
): tsNS.Statement {
  const f = ts.factory;

  const eventsType = toUnionType(ts, f, events);
  const commandsType = toUnionType(ts, f, commands);

  // { Foo: Foo['data']; Bar: Bar['data'] }
  const stateMembers = states.map((s) =>
    f.createPropertySignature(
      undefined,
      f.createIdentifier(s),
      undefined,
      f.createIndexedAccessTypeNode(
        f.createTypeReferenceNode(s),
        f.createLiteralTypeNode(f.createStringLiteral('data')),
      ),
    ),
  );
  const statesType = f.createTypeLiteralNode(stateMembers);

  // createBuilders()
  const callCreateBuilders = f.createCallExpression(f.createIdentifier('createBuilders'), undefined, []);

  // createBuilders().events<...>()
  const callEvents = f.createCallExpression(
    f.createPropertyAccessExpression(callCreateBuilders, f.createIdentifier('events')),
    [eventsType],
    [],
  );

  // ... .commands<...>()
  const callCommands = f.createCallExpression(
    f.createPropertyAccessExpression(callEvents, f.createIdentifier('commands')),
    [commandsType],
    [],
  );

  // ... .state<{...}>()
  const callState = f.createCallExpression(
    f.createPropertyAccessExpression(callCommands, f.createIdentifier('state')),
    [statesType],
    [],
  );

  return f.createVariableStatement(
    undefined,
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          // const { Events, Commands, State } = ...
          f.createObjectBindingPattern([
            f.createBindingElement(undefined, undefined, f.createIdentifier('Events')),
            f.createBindingElement(undefined, undefined, f.createIdentifier('Commands')),
            f.createBindingElement(undefined, undefined, f.createIdentifier('State')),
          ]),
          undefined,
          undefined,
          callState,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}
