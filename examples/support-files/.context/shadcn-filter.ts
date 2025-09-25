export function filter(components) {
  const seen = new Set();

  const wordBlacklist = [
    'image',
    'slot',
    'chat assitant',
    'code bar',
    'attachment',
    'details panel',
    'ring',
    'explorer menu',
    'logo',
    'narrative',
    'construct palette',
    'emoji',
    'code gen',
    'drag',
    'help',
    'updates',
    'top menu',
    'sticky note',
    'status',
    'space',
    'sidebar',
    'shape',
    'settings',
    'screen tab',
    'radiobutton',
  ].map((w) => w.toLowerCase());

  const substringBlackList = [
    'icon',
    'with',
    'diagram',
    'changelog',
    'slot',
    'details',
    'toolbar',
    'stepper',
    'shortcut',
    'script',
  ];

  return components
    .filter((component) => {
      const rawName = component.name;
      const name = rawName.toLowerCase().trim();
      const description = component.description.toUpperCase();

      // Exclude if name matches blacklist or contains forbidden substring
      if (wordBlacklist.includes(name)) return false;
      if (substringBlackList.some((substr) => name.includes(substr))) return false;

      const isComponentName =
        /^[a-zA-Z]+(?: [a-zA-Z]+){0,2}$/.test(rawName) && !/^(rectangle|vector|line|corner|\d+)$/.test(name);

      const isInstance = description === 'INSTANCE';
      const isNotDeepHierarchy = (name.match(/\//g) || []).length <= 3;

      const shouldKeep = isComponentName && isInstance && isNotDeepHierarchy;

      if (!shouldKeep) return false;

      // Deduplicate by name
      if (seen.has(name)) return false;
      seen.add(name);

      return true;
    })
    .map((component) => ({
      ...component,
      name: component.name.toLowerCase().trim().replace(/\s+/g, '-'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
