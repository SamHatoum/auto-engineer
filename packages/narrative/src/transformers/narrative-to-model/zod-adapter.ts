import { z } from 'zod';
import { Message } from '../../index';

function hasZodDef(obj: unknown): obj is { _def: unknown } {
  return typeof obj === 'object' && obj !== null && '_def' in obj;
}

export const unwrapZod = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let s = schema as unknown as Record<string, unknown>;
  // Unwrap common wrappers: Optional, Nullable, Default, Effects
  // Keep unwrapping until we hit a non-wrapper
  while (hasZodDef(s)) {
    const def = s._def as Record<string, unknown>;
    const typeName = def.typeName;

    if (
      typeName === 'ZodOptional' ||
      typeName === 'ZodNullable' ||
      typeName === 'ZodDefault' ||
      typeName === 'ZodEffects'
    ) {
      if (def.innerType !== undefined) {
        s = def.innerType as Record<string, unknown>;
      } else if (def.schema !== undefined) {
        s = def.schema as Record<string, unknown>;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return s as z.ZodTypeAny;
};

function handleZodLiteral(base: z.ZodTypeAny): string {
  if (!hasZodDef(base)) return 'unknown';
  const def = base._def as Record<string, unknown>;
  const val = def.value;
  return typeof val === 'string' ? JSON.stringify(val) : JSON.stringify(val);
}

function handleZodArray(base: z.ZodTypeAny): string {
  const elementType = extractZodType((base as z.ZodArray<z.ZodTypeAny>)._def.type);
  return `Array<${elementType}>`;
}

function handleZodObject(base: z.ZodTypeAny): string {
  const shape = (base as z.ZodObject<z.ZodRawShape>)._def.shape();
  const entries = Object.entries(shape)
    .map(([key, val]) => `${key}: ${extractZodType(val)}`)
    .join(', ');
  return `{${entries}}`;
}

function handleZodNullable(base: z.ZodTypeAny): string {
  const inner = extractZodType((base as z.ZodNullable<z.ZodTypeAny>)._def.innerType);
  return `${inner} | null`;
}

export const extractZodType = (schema: z.ZodTypeAny): string => {
  const base = unwrapZod(schema);
  if (!hasZodDef(base)) return 'unknown';
  const def = base._def as Record<string, unknown>;
  const typeName = def.typeName as string | undefined;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodLiteral':
      return handleZodLiteral(base);
    case 'ZodArray':
      return handleZodArray(base);
    case 'ZodObject':
      return handleZodObject(base);
    case 'ZodNullable':
      return handleZodNullable(base);
    default:
      return 'unknown';
  }
};

export const zodSchemaToFields = (schema: z.ZodTypeAny): Message['fields'] => {
  const base = unwrapZod(schema);
  if (!hasZodDef(base)) return [];
  const def = base._def as Record<string, unknown>;
  if (def.typeName !== 'ZodObject') return [];

  const shape = (base as z.ZodObject<z.ZodRawShape>)._def.shape();

  return Object.entries(shape).map(([name, field]) => {
    const unwrapped = unwrapZod(field);
    // treat Optional/Nullable/Default as not required
    const fieldWithDef = field;
    const raw = hasZodDef(fieldWithDef) ? (fieldWithDef._def as Record<string, unknown>).typeName : undefined;
    const required = raw !== 'ZodOptional' && raw !== 'ZodNullable' && raw !== 'ZodDefault';

    return {
      name,
      type: extractZodType(unwrapped),
      required,
    };
  });
};
