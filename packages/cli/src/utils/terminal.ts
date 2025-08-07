import chalk from 'chalk';
import { Config } from './config';

export const supportsColor = (config: Config): boolean => {
  if (config.noColor) return false;
  return process.stdout.isTTY && chalk.level > 0;
};

export const createOutput = (config: Config) => {
  const useColor = supportsColor(config);
  const isJsonOutput = config.output === 'json';

  const outputJson = (status: string, message: string) => {
    console.log(JSON.stringify({ status, message }));
  };

  const outputText = (prefix: string, message: string, colorFn?: (text: string) => string) => {
    const text = `${prefix} ${message}`;
    console.log(useColor && colorFn ? colorFn(text) : text);
  };

  return {
    success: (message: string) => {
      if (isJsonOutput) {
        outputJson('success', message);
      } else {
        outputText('✓', message, chalk.green);
      }
    },

    error: (message: string) => {
      if (isJsonOutput) {
        console.error(JSON.stringify({ status: 'error', message }));
      } else {
        const text = `✗ ${message}`;
        console.error(useColor ? chalk.red(text) : text);
      }
    },

    info: (message: string) => {
      if (isJsonOutput) {
        outputJson('info', message);
      } else {
        outputText('ℹ', message, chalk.blue);
      }
    },

    warn: (message: string) => {
      if (isJsonOutput) {
        outputJson('warning', message);
      } else {
        outputText('⚠', message, chalk.yellow);
      }
    },

    debug: (message: string) => {
      if (!config.debug) return;

      if (isJsonOutput) {
        outputJson('debug', message);
      } else {
        outputText('🐛', message, chalk.gray);
      }
    },

    log: (message: string) => {
      if (isJsonOutput) {
        console.log(JSON.stringify({ message }));
      } else {
        console.log(message);
      }
    },
  };
};

export const isStdinAvailable = (): boolean => {
  return !process.stdin.isTTY;
};

export const readStdin = (): Promise<string> => {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
};
