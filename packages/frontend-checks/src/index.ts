import { chromium, Browser } from 'playwright';
import { exec, execSync } from 'child_process';
import createDebug from 'debug';

const debug = createDebug('frontend-checks:browser');
const debugInstall = createDebug('frontend-checks:install');
const debugScreenshot = createDebug('frontend-checks:screenshot');
const debugErrors = createDebug('frontend-checks:errors');

class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: Browser | null = null;
  private browserInstalled = false;

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (BrowserManager.instance === null) {
      debug('Creating new BrowserManager instance');
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  private async ensureBrowserInstalled(): Promise<void> {
    if (this.browserInstalled) {
      debugInstall('Browser already marked as installed');
      return;
    }

    try {
      // Try to launch to see if browser is already installed
      debugInstall('Testing if Chromium is already installed...');
      const testBrowser = await chromium.launch();
      await testBrowser.close();
      this.browserInstalled = true;
      debugInstall('Chromium is already installed');
    } catch {
      // Browser not installed, install it
      console.log('Playwright Chromium not found. Installing...');
      debugInstall('Chromium not found, attempting automatic installation');
      try {
        // Try to install using npx (works in most environments)
        debugInstall('Running: npx playwright install chromium');
        execSync('npx playwright install chromium', {
          stdio: 'inherit',
          env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0' },
        });
        this.browserInstalled = true;
        console.log('Playwright Chromium installed successfully.');
        debugInstall('Chromium installation completed successfully');
      } catch (installError) {
        debugInstall('Failed to install Chromium: %O', installError);
        console.error('Failed to install Playwright Chromium automatically.');
        console.error('Please run: npx playwright install chromium');
        throw new Error('Playwright Chromium browser is not installed. Please run: npx playwright install chromium');
      }
    }
  }

  public async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      debug('Browser not initialized, ensuring installation and launching');
      await this.ensureBrowserInstalled();
      debug('Launching Chromium browser');
      this.browser = await chromium.launch();
      debug('Browser launched successfully');
    } else {
      debug('Reusing existing browser instance');
    }
    return this.browser;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      debug('Closing browser instance');
      await this.browser.close();
      this.browser = null;
      debug('Browser closed successfully');
    } else {
      debug('No browser instance to close');
    }
  }
}

export async function getConsoleErrors(url: string): Promise<string[]> {
  debugErrors('Getting console errors for URL: %s', url);
  const errors: string[] = [];
  const browserManager = BrowserManager.getInstance();
  const browser = await browserManager.getBrowser();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      debugErrors('Console error captured: %s', msg.text());
      errors.push(msg.text());
    }
  });

  debugErrors('Navigating to URL: %s', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.close();
  debugErrors('Found %d console errors', errors.length);

  return errors;
}

export async function closeBrowser(): Promise<void> {
  debug('Closing browser via exported function');
  const browserManager = BrowserManager.getInstance();
  await browserManager.closeBrowser();
}

export function getTsErrors(projectPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    debugErrors('Checking TypeScript errors in: %s', projectPath);
    // Using `pnpm exec tsc` is more robust as it uses the workspace's typescript compiler
    // and correctly resolves dependencies within the monorepo.
    const command = `tsc --noEmit`;

    exec(command, { cwd: projectPath }, (error, stdout, _stderr) => {
      if (error) {
        // tsc exits with an error code if there are any type errors.
        // The errors are in stdout, not stderr.
        const errors = stdout.split('\n').filter((line) => line.trim().length > 0);
        debugErrors('Found %d TypeScript errors', errors.length);
        resolve(errors);
      } else {
        // No errors
        debugErrors('No TypeScript errors found');
        resolve([]);
      }
    });
  });
}

export function getBuildErrors(projectPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    debugErrors('Checking build errors in: %s', projectPath);
    const command = `pnpm exec vite build`;
    exec(command, { cwd: projectPath }, (error, _stdout, stderr) => {
      if (error) {
        // Vite build errors are usually in stderr
        const errors = stderr.split('\n').filter((line) => line.trim().length > 0);
        debugErrors('Found %d build errors', errors.length);
        resolve(errors);
      } else {
        debugErrors('No build errors found');
        resolve([]);
      }
    });
  });
}

export async function getPageScreenshot(url: string): Promise<string> {
  debugScreenshot('Taking screenshot of URL: %s', url);
  const browserManager = BrowserManager.getInstance();
  const browser = await browserManager.getBrowser();
  const page = await browser.newPage();
  debugScreenshot('New page created, navigating to URL');

  await page.goto(url, { waitUntil: 'networkidle' });
  debugScreenshot('Page loaded, taking screenshot');

  const buffer = await page.screenshot();
  debugScreenshot('Screenshot captured, size: %d bytes', buffer.length);

  await page.close();
  debugScreenshot('Page closed');

  return buffer.toString('base64');
}
