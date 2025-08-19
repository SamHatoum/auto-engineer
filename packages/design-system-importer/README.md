# Design System Importer

Pull in your team’s design system to build consistent, on-brand apps—fast.  
Easily sync shared styles, components, and tokens from design tools or code.

## Available Importers

- **Figma** – Import components directly from Figma. Use our [Auto plugin]() to export design tokens effortlessly.
- **Code** – _(coming soon)_ Import tokens and components from an existing codebase.
- **NPM Package** – _(coming soon)_ Pull in a published design system as a dependency.

## Figma Importer

Sync your design system directly from Figma and integrate it into your local project.

### Prerequisites

- A **Figma Personal Access Token**
- A **Professional Figma Plan** (or higher)

### Setup

1. **Generate a personal access token**  
   Follow [these instructions](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens) from Figma.

2. **Get your design system file ID**  
   Open your Figma file and copy the part of the URL after `/design/`.

3. **Configure environment variables**
   - `FIGMA_PERSONAL_TOKEN` – The token from your Figma account
   - `FIGMA_FILE_ID` – The ID of the design file (found in the Figma URL after `/design/`)

4. **Publish your components in Figma**  
   Right-click anywhere → **Actions** → Search for “Publish changes to library”.

   > _(Optional)_ If you're using a public design system, you may need to move the file into one of your own Figma projects first.

5. **Export tokens with the Auto plugin**
   - Install the [Auto plugin]()
   - Run it inside your Figma file
   - Click **"Export Tokens"**
   - Save the exported file inside the `.context` folder of your output directory

6. **Run the importer**

   ```bash
   pnpm import:design-system
   ```
