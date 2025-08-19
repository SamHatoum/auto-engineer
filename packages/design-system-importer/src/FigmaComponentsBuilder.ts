import * as dotenv from 'dotenv';
import * as Figma from 'figma-api';

dotenv.config();

const figmaApi = new Figma.Api({
  personalAccessToken: process.env.FIGMA_PERSONAL_TOKEN as string,
});

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

  async withFigmaComponents() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await figmaApi.getFileComponents({ file_key: process.env.FIGMA_FILE_ID });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.meta.components.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log(JSON.stringify(response.meta.components.length, null, 2));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        this.components = response.meta.components.map(
          (component: { name: string; description: string; thumbnail_url: string }) => ({
            name: component.name,
            description: component.description,
            thumbnail: component.thumbnail_url,
          }),
        );
      }
    } catch (e) {
      console.error(e);
    }
    return this;
  }

  async withFigmaComponentSets() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await figmaApi.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.meta.component_sets.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        this.components = response.meta.component_sets.map(
          (component: { name: string; description: string; thumbnail_url: string }) => ({
            name: component.name,
            description: component.description ?? 'N/A',
            thumbnail: component.thumbnail_url ?? 'N/A',
          }),
        );
      }
    } catch (e) {
      console.error(e);
    }
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
    this.components = this.components
      .map((comp: FigmaComponent): FigmaComponent | null => {
        if (!comp?.name) return null;

        let str = comp.name.trim();

        if (str.includes('/')) {
          str = str.split('/')[0].trim();
        } else {
          str = str.split(' ')[0].trim();
        }

        if (str.length > 0) {
          str = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        } else {
          return null;
        }

        return {
          ...comp,
          name: str.toLowerCase(),
        };
      })
      .filter((c: FigmaComponent | null): c is FigmaComponent => Boolean(c));
  }

  withFilter(filter: FilterFunctionType): void {
    try {
      this.components = filter(this.components);
    } catch (e) {
      console.error('Error applying custom filter:', e);
    }
  }

  async withAllFigmaInstanceNames() {
    try {
      /// ----
      const usedComponentMap = new Map<string, { name: string; description: string; thumbnail: string }>();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { document } = await figmaApi.getFile({
        file_key: process.env.FIGMA_FILE_ID,
        depth: 1,
      });

      function walkTree(node: FigmaNode) {
        if (node.type === 'INSTANCE' && Boolean(node.name)) {
          if (!usedComponentMap.has(node.name)) {
            usedComponentMap.set(node.name, {
              name: node.name,
              description: node.description ?? '',
              thumbnail: node.thumbnail_url ?? '',
            });
          }
        }

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (node.children) {
          for (const child of node.children) {
            walkTree(child);
          }
        }
      }

      walkTree(document);

      this.components = Array.from(usedComponentMap.values());

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
      console.error(e);
    }
    return this;
  }

  build() {
    return this.components;
  }
}
