import * as dotenv from 'dotenv';
import * as Figma from 'figma-api';
import createDebug from 'debug';

const debug = createDebug('design-system-importer:figma-builder');
const debugComponents = createDebug('design-system-importer:figma-builder:components');
const debugFilters = createDebug('design-system-importer:figma-builder:filters');
const debugAPI = createDebug('design-system-importer:figma-builder:api');
const debugTree = createDebug('design-system-importer:figma-builder:tree');

dotenv.config();

debug('Initializing FigmaComponentsBuilder module');

// Add timeout wrapper for Figma API calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Figma API request timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
};

const figmaApi = new Figma.Api({
  personalAccessToken: process.env.FIGMA_PERSONAL_TOKEN as string,
});
debug('Figma API initialized with personal access token');

export interface FigmaComponent {
  name: string;
  description: string;
  thumbnail: string;
}

export type FilterFunctionType = (components: FigmaComponent[]) => FigmaComponent[];

interface FigmaNode {
  type: string;
  name: string;
  children: FigmaNode[];
  description: string;
  thumbnail_url: string;
}

export class FigmaComponentsBuilder {
  components: FigmaComponent[] = [];

  constructor() {
    debug('FigmaComponentsBuilder instance created');
    debugComponents('Initial components array: empty');
  }

  async withFigmaComponents() {
    debugAPI('Fetching Figma components from file: %s', process.env.FIGMA_FILE_ID);

    if (
      process.env.FIGMA_PERSONAL_TOKEN?.trim() === '' ||
      process.env.FIGMA_FILE_ID?.trim() === '' ||
      process.env.FIGMA_PERSONAL_TOKEN === undefined ||
      process.env.FIGMA_FILE_ID === undefined
    ) {
      debugAPI('Missing Figma credentials. FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID not set');
      console.warn('Skipping Figma import: Missing FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID in environment');
      return this;
    }

    try {
      debugAPI('Making API call to getFileComponents...');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await withTimeout(figmaApi.getFileComponents({ file_key: process.env.FIGMA_FILE_ID }), 10000);
      debugAPI('API response received');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.meta.components.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        debugComponents('Found %d components in Figma file', response.meta.components.length);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        this.components = response.meta.components.map(
          (component: { name: string; description: string; thumbnail_url: string }) => {
            debugComponents('Processing component: %s', component.name);
            return {
              name: component.name,
              description: component.description,
              thumbnail: component.thumbnail_url,
            };
          },
        );
        debugComponents('Successfully mapped %d components', this.components.length);
      } else {
        debugComponents('No components found in Figma file');
      }
    } catch (e) {
      debugAPI('ERROR: Failed to fetch Figma components: %O', e);
      console.error('Failed to fetch Figma components:', e);
    }
    debugComponents('withFigmaComponents complete, total components: %d', this.components.length);
    return this;
  }

  async withFigmaComponentSets() {
    debugAPI('Fetching Figma component sets from file: %s', process.env.FIGMA_FILE_ID);

    if (
      process.env.FIGMA_PERSONAL_TOKEN?.trim() === '' ||
      process.env.FIGMA_FILE_ID?.trim() === '' ||
      process.env.FIGMA_PERSONAL_TOKEN === undefined ||
      process.env.FIGMA_FILE_ID === undefined
    ) {
      debugAPI('Missing Figma credentials. FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID not set');
      console.warn('Skipping Figma import: Missing FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID in environment');
      return this;
    }

    try {
      debugAPI('Making API call to getFileComponentSets...');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await withTimeout(figmaApi.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID }), 10000);
      debugAPI('API response received');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.meta.component_sets.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        debugComponents('Found %d component sets in Figma file', response.meta.component_sets.length);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        this.components = response.meta.component_sets.map(
          (component: { name: string; description: string; thumbnail_url: string }) => {
            debugComponents('Processing component set: %s', component.name);
            const mapped = {
              name: component.name,
              description: component.description ?? 'N/A',
              thumbnail: component.thumbnail_url ?? 'N/A',
            };
            debugComponents('  - Description: %s', mapped.description.substring(0, 50));
            debugComponents('  - Has thumbnail: %s', mapped.thumbnail !== 'N/A');
            return mapped;
          },
        );
        debugComponents('Successfully mapped %d component sets', this.components.length);
      } else {
        debugComponents('No component sets found in Figma file');
      }
    } catch (e) {
      debugAPI('ERROR: Failed to fetch Figma component sets: %O', e);
      console.error('Failed to fetch Figma component sets:', e);
    }
    debugComponents('withFigmaComponentSets complete, total components: %d', this.components.length);
    return this;
  }

  // extractBracketedComponents(item: FigmaComponent): FigmaComponent | null {
  //   const match = item.name.match(/<([^>]+)>/);
  //   return match ? { ...item, name: match[1].trim() } : null;
  // }
  //
  // withFilteredNamesForMui() {
  //   // eslint-disable-next-line @typescript-eslint/unbound-method
  //   this.components = this.components.map(this.extractBracketedComponents).filter(Boolean) as FigmaComponent[];
  // }

  withFilteredNamesForShadcn(): void {
    debugFilters('Applying Shadcn name filter to %d components', this.components.length);
    const originalCount = this.components.length;
    this.components = this.components
      .map((comp: FigmaComponent): FigmaComponent | null => {
        if (!comp?.name) {
          debugFilters('Skipping component with no name');
          return null;
        }

        let str = comp.name.trim();
        debugFilters('Processing component name: %s', str);

        if (str.includes('/')) {
          const original = str;
          str = str.split('/')[0].trim();
          debugFilters('  Split by /: %s -> %s', original, str);
        } else {
          const original = str;
          str = str.split(' ')[0].trim();
          debugFilters('  Split by space: %s -> %s', original, str);
        }

        if (str.length > 0) {
          const capitalized = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
          const final = capitalized.toLowerCase();
          debugFilters('  Normalized: %s -> %s', str, final);
          return {
            ...comp,
            name: final,
          };
        } else {
          debugFilters('  Empty string after processing, skipping');
          return null;
        }
      })
      .filter((c: FigmaComponent | null): c is FigmaComponent => Boolean(c));
    debugFilters('Shadcn filter complete: %d -> %d components', originalCount, this.components.length);
  }

  withFilter(filter: FilterFunctionType): void {
    debugFilters('Applying custom filter function to %d components', this.components.length);
    const originalCount = this.components.length;
    try {
      this.components = filter(this.components);
      debugFilters('Custom filter applied successfully: %d -> %d components', originalCount, this.components.length);
    } catch (e) {
      debugFilters('ERROR: Failed to apply custom filter: %O', e);
      console.error('Error applying custom filter:', e);
    }
  }

  async withAllFigmaInstanceNames() {
    debugAPI('Fetching all Figma instance names from file: %s', process.env.FIGMA_FILE_ID);

    if (
      process.env.FIGMA_PERSONAL_TOKEN?.trim() === '' ||
      process.env.FIGMA_FILE_ID?.trim() === '' ||
      process.env.FIGMA_PERSONAL_TOKEN === undefined ||
      process.env.FIGMA_FILE_ID === undefined
    ) {
      debugAPI('Missing Figma credentials. FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID not set');
      console.warn('Skipping Figma import: Missing FIGMA_PERSONAL_TOKEN or FIGMA_FILE_ID in environment');
      return this;
    }

    try {
      /// ----
      const usedComponentMap = new Map<string, { name: string; description: string; thumbnail: string }>();
      debugTree('Created component map for tracking unique instances');

      debugAPI('Making API call to getFile with depth: 1...');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { document } = await withTimeout(
        figmaApi.getFile({
          file_key: process.env.FIGMA_FILE_ID,
          depth: 1,
        }),
        10000,
      );
      debugAPI('File document received, starting tree walk');

      // eslint-disable-next-line complexity
      function walkTree(node: FigmaNode, depth: number = 0) {
        const indent = '  '.repeat(depth);
        debugTree('%sVisiting node: %s (type: %s)', indent, node.name, node.type);

        if (node.type === 'INSTANCE' && Boolean(node.name)) {
          if (!usedComponentMap.has(node.name)) {
            debugTree('%s  -> Found new instance: %s', indent, node.name);
            usedComponentMap.set(node.name, {
              name: node.name,
              description: node.description ?? '',
              thumbnail: node.thumbnail_url ?? '',
            });
            debugTree('%s     Description: %s', indent, node.description ? 'present' : 'empty');
            debugTree('%s     Thumbnail: %s', indent, node.thumbnail_url ? 'present' : 'missing');
          } else {
            debugTree('%s  -> Instance already tracked: %s', indent, node.name);
          }
        }

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (node.children) {
          debugTree('%s  Has %d children', indent, node.children.length);
          for (const child of node.children) {
            walkTree(child, depth + 1);
          }
        }
      }

      debugTree('Starting tree walk from document root');
      walkTree(document);
      debugTree('Tree walk complete');

      this.components = Array.from(usedComponentMap.values());
      debugComponents('Extracted %d unique component instances', this.components.length);

      /// ----

      // const components = []
      // // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      // const { meta } = await figmaApi.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID });
      // // console.log(response);
      //
      // console.log('Component sets:', meta.component_sets); // ⬅️ Check this!
      //
      // const componentSetIds = meta.component_sets.map(componentSet => componentSet.node_id); // This must return valid Figma node IDs
      //
      // console.log('ComponentSet IDs:', componentSetIds);
      //
      // const fileNodes = await figmaApi.getFileNodes({
      //   file_key: process.env.FIGMA_FILE_ID,
      // }, {
      //   ids: componentSetIds.join(','),
      // });
      //
      // for (const node of Object.values(fileNodes.nodes)) {
      //   const componentSet = node.document;
      //
      //   if (componentSet.type === 'COMPONENT_SET' && componentSet.children?.length) {
      //     const variants = componentSet.children;
      //     const firstVariant = variants[0]; // or apply filtering logic
      //
      //     components.push({
      //       name: componentSet.name,       // e.g. "Button"
      //       id: firstVariant.id,           // this is the actual variant node
      //       variantName: firstVariant.name // e.g. "primary=true, size=md"
      //     });
      //   }
      // }
      //
      // fs.writeFileSync('output.json', JSON.stringify(components, null, 2));

      // if (Boolean(response)) {
      //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      //   this.components = response.meta.component_sets.map(
      //     (component: { name: string; description: string; thumbnail_url: string }) => ({
      //       name: component.name,
      //       description: component.description,
      //       thumbnail_url: component.thumbnail_url,
      //     }),
      //   );
      // }
    } catch (e) {
      debugAPI('ERROR: Failed to fetch Figma instance names: %O', e);
      console.error('Failed to fetch Figma instance names:', e);
    }
    debugComponents('withAllFigmaInstanceNames complete, total components: %d', this.components.length);
    return this;
  }

  build() {
    debug('Building final component list');
    debugComponents('Returning %d components', this.components.length);
    if (this.components.length > 0) {
      debugComponents('First component: %s', this.components[0].name);
      debugComponents('Last component: %s', this.components[this.components.length - 1].name);
    }
    return this.components;
  }
}
