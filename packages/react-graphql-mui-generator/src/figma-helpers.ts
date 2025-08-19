interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

type VariableValue = { type: 'VARIABLE_ALIAS'; id: string } | RGBA | string | number | boolean;

interface Variable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'STRING' | 'FLOAT' | 'BOOLEAN' | string;
  valuesByMode: Record<string, VariableValue>;
}

interface VariableCollection {
  name: string;
  modes: { modeId: string; name: string }[];
  variables: Variable[];
}

interface ResolveResult {
  unresolved: true;
  aliasId: string;
  modeId?: string;
}

type ResolvedValue = string | number | boolean | ResolveResult;

// Guard
function isRgba(value: unknown): value is RGBA {
  return typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value && 'a' in value;
}

// RGBA → HSLA
function rgbaToHsl(rgba: RGBA): string {
  const { r, g, b, a } = rgba;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${a})`;
}

/* eslint-disable complexity */
function resolveAlias(
  aliasId: string,
  variablesById: Record<string, Variable>,
  modeId: string,
  visited: Set<string> = new Set(),
): ResolvedValue {
  if (visited.has(aliasId)) {
    return { unresolved: true, aliasId };
  }
  visited.add(aliasId);

  const variable = variablesById[aliasId];
  if (variable === undefined) {
    return { unresolved: true, aliasId };
  }

  let value = variable.valuesByMode[modeId];
  if (value === undefined) {
    const availableModes = Object.keys(variable.valuesByMode);
    if (availableModes.length > 0) {
      const fallbackMode = availableModes[0];
      value = variable.valuesByMode[fallbackMode];
    } else {
      return { unresolved: true, aliasId, modeId };
    }
  }

  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return resolveAlias(value.id, variablesById, modeId, visited);
  }

  if (variable.resolvedType === 'COLOR' && isRgba(value)) {
    return rgbaToHsl(value);
  }

  return value as ResolvedValue;
}
/* eslint-enable complexity */

export function flattenFigmaVariables(jsonData: VariableCollection[]): Record<string, ResolvedValue> {
  const flattened: Record<string, ResolvedValue> = {};
  const variablesById: Record<string, Variable> = {};

  jsonData.forEach((collection) => {
    collection.variables.forEach((variable) => {
      variablesById[variable.id] = variable;
    });
  });

  jsonData.forEach((collection) => {
    const collectionName = collection.name;

    const modeNames: Record<string, string> = {};
    collection.modes.forEach((mode) => {
      modeNames[mode.modeId] = mode.name;
    });

    collection.variables.forEach((variable) => {
      const variableName = variable.name;

      Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
        const modeName = modeNames[modeId] || modeId;
        const key = `${collectionName}/${variableName}/${modeName.toLowerCase().replace(/\s+/g, '-')}`;

        let resolvedValue: ResolvedValue;
        if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
          resolvedValue = resolveAlias(value.id, variablesById, modeId);
        } else if (variable.resolvedType === 'COLOR' && isRgba(value)) {
          resolvedValue = rgbaToHsl(value);
        } else {
          resolvedValue = value as ResolvedValue;
        }

        flattened[key] = resolvedValue;
      });
    });
  });

  return flattened;
}
