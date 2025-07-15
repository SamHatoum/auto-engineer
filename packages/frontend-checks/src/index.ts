import { chromium, Browser } from 'playwright';
import { exec } from 'child_process';

class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: Browser | null = null;

  private constructor() { }

  public static getInstance(): BrowserManager {
    if (BrowserManager.instance === null) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  public async getBrowser(): Promise<Browser> {
    if (!this.browser) {
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

  page.on('console', msg => {
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
    const command = `tsc -b`;

    exec(command, { cwd: projectPath }, (error, stdout, _stderr) => {
      if (error) {
        // tsc exits with an error code if there are any type errors.
        // The errors are in stdout, not stderr.
        const errors = stdout.split('\n').filter(line => line.trim().length > 0);
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
        const errors = stderr.split('\n').filter(line => line.trim().length > 0);
        resolve(errors);
      } else {
        resolve([]);
      }
    });
  });
}
