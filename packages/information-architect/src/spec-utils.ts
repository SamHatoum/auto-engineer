import type { ClientSpecNode } from '@auto-engineer/narrative';

function buildFullPath(path: string[], title: string, separator: string): string {
  return path.length > 0 ? path.join(separator) + separator + title : title;
}

function shouldIncludeTitleInPath(title: string | undefined): boolean {
  return title !== undefined && title !== '' && title.trim() !== '';
}

function createNewPath(path: string[], title: string | undefined): string[] {
  return shouldIncludeTitleInPath(title) && title !== undefined ? [...path, title] : path;
}

function hasChildren(node: ClientSpecNode): boolean {
  return node.type === 'describe' && node.children !== undefined && node.children.length > 0;
}

export function flattenClientSpecs(nodes: ClientSpecNode[] | undefined, separator: string = ' → '): string[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const results: string[] = [];

  function traverse(nodes: ClientSpecNode[], path: string[] = []): void {
    for (const node of nodes) {
      if (node.type === 'it') {
        results.push(buildFullPath(path, node.title, separator));
      } else if (hasChildren(node) && node.children !== undefined) {
        const newPath = createNewPath(path, node.title);
        traverse(node.children, newPath);
      }
    }
  }

  traverse(nodes);
  return results;
}
