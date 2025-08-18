import { Config } from './config';
import { createOutput } from './terminal';

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

    const isDisabled = process.env.AUTO_ENGINEER_ANALYTICS === 'false';
    this.optedIn = !isDisabled;
    return this.optedIn;
  }

  private prepareAnalyticsData(
    data: Omit<AnalyticsData, 'timestamp' | 'version' | 'nodeVersion' | 'platform'>,
  ): AnalyticsData {
    return {
      ...data,
      timestamp: Date.now(),
      version: process.env.npm_package_version ?? '0.1.2',
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  async track(data: Omit<AnalyticsData, 'timestamp' | 'version' | 'nodeVersion' | 'platform'>): Promise<void> {
    const consented = await this.promptForConsent();

    if (!consented) {
      return;
    }

    const analyticsData = this.prepareAnalyticsData(data);
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
