import chalk from 'chalk';
import { Config } from './config.js';

export const supportsColor = (config: Config): boolean => {
  if (config.noColor) return false;
  return process.stdout.isTTY && chalk.level > 0;
};

export const createOutput = (config: Config) => {
  const useColor = supportsColor(config);
  
  return {
    success: (message: string) => {
      if (config.output === 'json') {
        console.log(JSON.stringify({ status: 'success', message }));
      } else {
        console.log(useColor ? chalk.green(`✓ ${message}`) : `✓ ${message}`);
      }
    },
    
    error: (message: string) => {
      if (config.output === 'json') {
        console.error(JSON.stringify({ status: 'error', message }));
      } else {
        console.error(useColor ? chalk.red(`✗ ${message}`) : `✗ ${message}`);
      }
    },
    
    info: (message: string) => {
      if (config.output === 'json') {
        console.log(JSON.stringify({ status: 'info', message }));
      } else {
        console.log(useColor ? chalk.blue(`ℹ ${message}`) : `ℹ ${message}`);
      }
    },
    
    warn: (message: string) => {
      if (config.output === 'json') {
        console.log(JSON.stringify({ status: 'warning', message }));
      } else {
        console.log(useColor ? chalk.yellow(`⚠ ${message}`) : `⚠ ${message}`);
      }
    },
    
    debug: (message: string) => {
      if (config.debug) {
        if (config.output === 'json') {
          console.log(JSON.stringify({ status: 'debug', message }));
        } else {
          console.log(useColor ? chalk.gray(`🐛 ${message}`) : `🐛 ${message}`);
        }
      }
    },
    
    log: (message: string) => {
      if (config.output === 'json') {
        console.log(JSON.stringify({ message }));
      } else {
        console.log(message);
      }
    }
  };
};

export const isStdinAvailable = (): boolean => {
  return !process.stdin.isTTY;
};

export const readStdin = (): Promise<string> => {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}; 