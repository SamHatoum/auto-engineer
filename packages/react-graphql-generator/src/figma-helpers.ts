function rgbaToHsl(rgba) {
  const { r, g, b, a } = rgba;

  // Convert RGB (0-1) to HSL
  const r1 = r,
    g1 = g,
    b1 = b;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r1:
        h = (g1 - b1) / d + (g1 < b1 ? 6 : 0);
        break;
      case g1:
        h = (b1 - r1) / d + 2;
        break;
      case b1:
        h = (r1 - g1) / d + 4;
        break;
    }
    h /= 6;
  }

  // Format HSL values: hue in degrees (0-360), saturation and lightness as percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return HSL string without commas
  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

// Function to resolve alias value
function resolveAlias(aliasId, variablesById, modeId, visited = new Set()) {
  if (visited.has(aliasId)) {
    return { unresolved: true, aliasId }; // Prevent infinite recursion
  }
  visited.add(aliasId);

  const variable = variablesById[aliasId];
  if (!variable) {
    return { unresolved: true, aliasId };
  }

  let value = variable.valuesByMode[modeId];
  if (!value) {
    // Fallback to any available mode if the specific mode is not found
    const availableModes = Object.keys(variable.valuesByMode);
    if (availableModes.length > 0) {
      const fallbackMode = availableModes[0];
      value = variable.valuesByMode[fallbackMode];
    } else {
      return { unresolved: true, aliasId, modeId };
    }
  }

  if (value.type === 'VARIABLE_ALIAS') {
    return resolveAlias(value.id, variablesById, modeId, visited);
  }

  if (variable.resolvedType === 'COLOR') {
    return rgbaToHsl(value);
  }
  return value;
}

// Function to flatten Figma variables
export function flattenFigmaVariables(jsonData) {
  const flattened = {};

  // Build a lookup table for variables by ID
  const variablesById = {};
  jsonData.forEach((collection) => {
    collection.variables.forEach((variable) => {
      variablesById[variable.id] = variable;
    });
  });

  // Process each collection
  jsonData.forEach((collection) => {
    const collectionName = collection.name;

    // Get mode names mapped to mode IDs
    const modeNames = {};
    collection.modes.forEach((mode) => {
      modeNames[mode.modeId] = mode.name;
    });

    // Process each variable
    collection.variables.forEach((variable) => {
      const variableName = variable.name;

      // Process each mode for the variable
      Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
        const modeName = modeNames[modeId] || modeId;
        const key = `${collectionName}/${variableName}/${modeName.toLowerCase().replace(/\s+/g, '-')}`;

        let resolvedValue;
        if (value.type === 'VARIABLE_ALIAS') {
          resolvedValue = resolveAlias(value.id, variablesById, modeId);
        } else if (variable.resolvedType === 'COLOR') {
          resolvedValue = rgbaToHsl(value);
        } else {
          resolvedValue = value;
        }

        flattened[key] = resolvedValue;
      });
    });
  });

  return flattened;
}
