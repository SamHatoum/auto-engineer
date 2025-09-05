import tsNS from 'typescript';
import { typeFromString } from '../ast/emit-helpers';

type Message = {
  type: 'command' | 'event' | 'state';
  name: string;
  fields: { name: string; type: string; required: boolean }[];
};

export function buildTypeAliases(ts: typeof tsNS, messages: Message[]): tsNS.Statement[] {
  const f = ts.factory;

  const mkK = (s: string) => f.createLiteralTypeNode(f.createStringLiteral(s, true));

  return messages.map((m) => {
    const typeArgs: tsNS.TypeNode[] = [
      mkK(m.name),
      // payload object type
      (() => {
        const members = m.fields.map((fld) =>
          f.createPropertySignature(
            undefined,
            /^[A-Za-z_]\w*$/.test(fld.name) ? f.createIdentifier(fld.name) : f.createStringLiteral(fld.name, true),
            fld.required ? undefined : f.createToken(ts.SyntaxKind.QuestionToken),
            typeFromString(ts, f, fld.type),
          ),
        );
        const lit = f.createTypeLiteralNode(members);
        // Allow multiline formatting
        return lit;
      })(),
    ];

    const name = f.createIdentifier(m.name);

    const rhs = f.createTypeReferenceNode(
      m.type === 'event' ? 'Event' : m.type === 'command' ? 'Command' : 'State',
      typeArgs,
    );

    return f.createTypeAliasDeclaration(
      undefined, // No export keyword
      name,
      [],
      rhs,
    );
  });
}
