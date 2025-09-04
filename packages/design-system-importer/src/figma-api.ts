import * as dotenv from 'dotenv';
import * as Figma from 'figma-api';
import createDebug from 'debug';

dotenv.config();

const debugFigma = createDebug('design-system-importer:figma');

debugFigma('Initializing Figma API with personal access token');
const api = new Figma.Api({
  personalAccessToken: process.env.FIGMA_PERSONAL_TOKEN as string,
});
debugFigma('Figma API initialized');

export async function getFigmaComponents(): Promise<{ name: string; description: string; thumbnail: string }[]> {
  debugFigma('Fetching Figma components from file: %s', process.env.FIGMA_FILE_ID);
  let components: { name: string; description: string; thumbnail: string }[] = [];

  try {
    debugFigma('Making API call to Figma...');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await api.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID });
    debugFigma('Figma API response received');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    components = response.meta.component_sets.map(
      (component: { name: string; description: string; thumbnail_url: string }) => {
        debugFigma('Processing component: %s', component.name);
        return {
          name: component.name,
          description: component.description,
          thumbnail: component.thumbnail_url,
        };
      },
    );

    debugFigma('Successfully fetched %d components from Figma', components.length);
    console.log('figma response: ', response);
  } catch (e) {
    debugFigma('ERROR: Failed to fetch Figma components: %O', e);
    console.error(e);
  }

  console.log(components.length);
  return components;
}
