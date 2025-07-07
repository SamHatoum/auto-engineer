import { createError } from './errors.js';

export interface Config {
  debug: boolean;
  noColor: boolean;
  output: 'text' | 'json';
  apiToken?: string;
  projectPath?: string;
}

const parseNoColor = (): boolean => {
  return process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
};

const parseOutputFormat = (): 'text' | 'json' => {
  return process.env.OUTPUT_FORMAT === 'json' ? 'json' : 'text';
};

const getEnvConfig = (): Partial<Config> => {
  return {
    debug: process.env.DEBUG === 'auto-engineer',
    noColor: parseNoColor(),
    output: parseOutputFormat(),
    apiToken: process.env.AUTO_ENGINEER_API_TOKEN,
    projectPath: process.env.AUTO_ENGINEER_PROJECT_PATH,
  };
};

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

const validateApiToken = (apiToken: string | undefined): void => {
  if (apiToken !== undefined && apiToken !== null && apiToken.length > 0 && apiToken.length < 10) {
    throw createError(
      'API token must be at least 10 characters long',
      'E4003'
    );
  }
};

const validateProjectPath = (projectPath: string | undefined): void => {
  if (projectPath !== undefined && projectPath !== null && projectPath.length > 0) {
    const isValidPath = projectPath.startsWith('/') || projectPath.startsWith('./');
    if (!isValidPath) {
      throw createError(
        'Project path must be an absolute path or relative path starting with ./',
        'E4004'
      );
    }
  }
};

export const validateConfig = (config: Config): void => {
  const { apiToken, projectPath } = config;
  
  validateApiToken(apiToken);
  validateProjectPath(projectPath);
}; 