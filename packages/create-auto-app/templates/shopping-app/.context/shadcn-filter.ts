export function filter(components) {
  const seen = new Set<string>();

  return components
    .map((comp) => {
      if (!comp?.name) return null;

      let str = comp.name.trim();

      // Normalize the name
      str = str.includes('/') ? str.split('/')[0].trim() : str.split(' ')[0].trim();

      if (!str) return null;

      // Capitalize first letter
      str = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

      return {
        ...comp,
        name: str.toLowerCase(),
      };
    })
    .filter((c) => {
      if (!c) return false;
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
}
