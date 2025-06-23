import inquirer from 'inquirer';
import { Config } from './config.js';
import { createOutput } from './terminal.js';

export interface AnalyticsData {
  command: string;
  timestamp: number;
  version: string;
  nodeVersion: string;
  platform: string;
  success: boolean;
  errorCode?: string;
}

export class Analytics {
  private config: Config;
  private output: ReturnType<typeof createOutput>;
  private optedIn: boolean | null = null;

  constructor(config: Config) {
    this.config = config;
    this.output = createOutput(config);
  }

  async promptForConsent(): Promise<boolean> {
    if (this.optedIn !== null) {
      return this.optedIn;
    }

    // Check if already opted in via environment variable
    if (process.env.AUTO_ENGINEER_ANALYTICS === 'true') {
      this.optedIn = true;
      return true;
    }

    if (process.env.AUTO_ENGINEER_ANALYTICS === 'false') {
      this.optedIn = false;
      return false;
    }

    // Prompt user for consent
    try {
      const { allowAnalytics } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'allowAnalytics',
          message: 'Would you like to share anonymous usage analytics to help improve auto-engineer?',
          default: false,
        },
      ]);

      this.optedIn = allowAnalytics;
      
      if (allowAnalytics) {
        this.output.info('Analytics enabled. You can disable this anytime with AUTO_ENGINEER_ANALYTICS=false');
      } else {
        this.output.info('Analytics disabled. You can enable this anytime with AUTO_ENGINEER_ANALYTICS=true');
      }

      return allowAnalytics;
    } catch (error) {
      // If prompt fails (e.g., non-interactive terminal), default to false
      this.optedIn = false;
      return false;
    }
  }

  async track(data: Omit<AnalyticsData, 'timestamp' | 'version' | 'nodeVersion' | 'platform'>): Promise<void> {
    const consented = await this.promptForConsent();
    
    if (!consented) {
      return;
    }

    const analyticsData: AnalyticsData = {
      ...data,
      timestamp: Date.now(),
      version: process.env.npm_package_version || '0.1.2',
      nodeVersion: process.version,
      platform: process.platform,
    };

    // In a real implementation, you would send this data to your analytics service
    // For now, we'll just log it in debug mode
    this.output.debug(`Analytics: ${JSON.stringify(analyticsData)}`);
  }

  async trackCommand(command: string, success: boolean, errorCode?: string): Promise<void> {
    await this.track({
      command,
      success,
      errorCode,
    });
  }
} 