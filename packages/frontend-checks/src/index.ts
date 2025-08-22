import { chromium, Browser } from 'playwright';
import { exec, execSync } from 'child_process';

class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: Browser | null = null;
  private browserInstalled = false;

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (BrowserManager.instance === null) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  private async ensureBrowserInstalled(): Promise<void> {
    if (this.browserInstalled) {
      return;
    }

    try {
      // Try to launch to see if browser is already installed
      const testBrowser = await chromium.launch();
      await testBrowser.close();
      this.browserInstalled = true;
    } catch (error) {
      // Browser not installed, install it
      console.log('Playwright Chromium not found. Installing...');
      try {
        // Try to install using npx (works in most environments)
        execSync('npx playwright install chromium', {
          stdio: 'inherit',
          env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0' },
        });
        this.browserInstalled = true;
        console.log('Playwright Chromium installed successfully.');
      } catch (installError) {
        console.error('Failed to install Playwright Chromium automatically.');
        console.error('Please run: npx playwright install chromium');
        throw new Error('Playwright Chromium browser is not installed. Please run: npx playwright install chromium');
      }
    }
  }

  public async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      await this.ensureBrowserInstalled();
      this.browser = await chromium.launch();
    }
    return this.browser;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export async function getConsoleErrors(url: string): Promise<string[]> {
  const errors: string[] = [];
  const browserManager = BrowserManager.getInstance();
  const browser = await browserManager.getBrowser();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.close();

  return errors;
}

export async function closeBrowser(): Promise<void> {
  const browserManager = BrowserManager.getInstance();
  await browserManager.closeBrowser();
}

export function getTsErrors(projectPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    // Using `pnpm exec tsc` is more robust as it uses the workspace's typescript compiler
    // and correctly resolves dependencies within the monorepo.
    const command = `tsc --noEmit`;

    exec(command, { cwd: projectPath }, (error, stdout, _stderr) => {
      if (error) {
        // tsc exits with an error code if there are any type errors.
        // The errors are in stdout, not stderr.
        const errors = stdout.split('\n').filter((line) => line.trim().length > 0);
        resolve(errors);
      } else {
        // No errors
        resolve([]);
      }
    });
  });
}

export function getBuildErrors(projectPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    const command = `pnpm exec vite build`;
    exec(command, { cwd: projectPath }, (error, _stdout, stderr) => {
      if (error) {
        // Vite build errors are usually in stderr
        const errors = stderr.split('\n').filter((line) => line.trim().length > 0);
        resolve(errors);
      } else {
        resolve([]);
      }
    });
  });
}

export async function getPageScreenshot(url: string): Promise<string> {
  const browserManager = BrowserManager.getInstance();
  const browser = await browserManager.getBrowser();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });

  const buffer = await page.screenshot();

  await page.close();

  return buffer.toString('base64');
}
