import { createError } from './errors.js';

export interface Config {
  debug: boolean;
  noColor: boolean;
  output: 'text' | 'json';
  apiToken?: string;
  projectPath?: string;
}

const getEnvConfig = (): Partial<Config> => ({
  debug: process.env.DEBUG === 'auto-engineer',
  noColor: process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true',
  output: process.env.OUTPUT_FORMAT === 'json' ? 'json' : 'text',
  apiToken: process.env.AUTO_ENGINEER_API_TOKEN,
  projectPath: process.env.AUTO_ENGINEER_PROJECT_PATH,
});

const getDefaultConfig = (): Config => ({
  debug: false,
  noColor: false,
  output: 'text',
});

export const loadConfig = (cliArgs: Partial<Config> = {}): Config => {
  const envConfig = getEnvConfig();
  const defaultConfig = getDefaultConfig();
  
  // Merge in order of precedence: CLI args > env vars > defaults
  return {
    ...defaultConfig,
    ...envConfig,
    ...cliArgs,
  };
};

export const validateConfig = (config: Config): void => {
  if (config.apiToken && config.apiToken.length < 10) {
    throw createError(
      'API token must be at least 10 characters long',
      'E4003'
    );
  }
  
  if (config.projectPath && !config.projectPath.startsWith('/') && !config.projectPath.startsWith('./')) {
    throw createError(
      'Project path must be an absolute path or relative path starting with ./',
      'E4004'
    );
  }
}; 