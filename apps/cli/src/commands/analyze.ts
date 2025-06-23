import { Command } from 'commander';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError, createError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import { isStdinAvailable, readStdin } from '../utils/terminal.js';
import path from 'path';
import fs from 'fs/promises';

export interface AnalysisResult {
  files: number;
  lines: number;
  complexity: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
  }>;
}

export const createAnalyzeCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);
  
  return new Command('analyze')
    .description('Analyze code quality and provide insights')
    .option('-p, --path <path>', 'Path to analyze (default: current directory)')
    .option('-f, --format <format>', 'Output format (text, json)', 'text')
    .option('--stdin', 'Analyze content from STDIN')
    .action(async (options) => {
      try {
        output.debug('Analyze command started');
        
        let content = '';
        let analyzePath = options.path || process.cwd();
        
        // Handle STDIN input (Section 3.1)
        if (options.stdin || isStdinAvailable()) {
          output.info('Reading content from STDIN...');
          content = await readStdin();
          analyzePath = 'stdin';
        }
        
        // Validate path exists (cross-platform compatibility - Section 3.3)
        if (analyzePath !== 'stdin') {
          try {
            const stats = await fs.stat(analyzePath);
            if (!stats.isDirectory() && !stats.isFile()) {
              throw createError(`Path ${analyzePath} is not a file or directory`, 'E4007');
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              throw createError(`Path ${analyzePath} does not exist`, 'E4008');
            }
            throw error;
          }
        }
        
        // Simulate analysis
        output.info(`Analyzing ${analyzePath}...`);
        
        const result: AnalysisResult = {
          files: 15,
          lines: 1250,
          complexity: 8.5,
          issues: [
            {
              type: 'warning',
              message: 'Consider adding JSDoc comments to public functions',
              file: 'src/utils/config.ts',
              line: 25,
            },
            {
              type: 'info',
              message: 'Good test coverage detected',
            },
            {
              type: 'error',
              message: 'Unused import detected',
              file: 'src/commands/basic-example.ts',
              line: 3,
            },
          ],
        };
        
        // Structured output (Section 3.2)
        if (options.format === 'json' || config.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Human-readable output
          output.success(`Analysis complete for ${analyzePath}`);
          output.log(`Files analyzed: ${result.files}`);
          output.log(`Total lines: ${result.lines}`);
          output.log(`Complexity score: ${result.complexity}/10`);
          
          if (result.issues.length > 0) {
            output.log('\nIssues found:');
            result.issues.forEach((issue) => {
              const icon = issue.type === 'error' ? '✗' : issue.type === 'warning' ? '⚠' : 'ℹ';
              const color = issue.type === 'error' ? 'red' : issue.type === 'warning' ? 'yellow' : 'blue';
              const location = issue.file && issue.line ? ` (${issue.file}:${issue.line})` : '';
              output.log(`${icon} ${issue.message}${location}`);
            });
          } else {
            output.success('No issues found!');
          }
        }
        
        // Track analytics
        await analytics.trackCommand('analyze', true);
        
        output.debug('Analyze command completed successfully');
        
      } catch (error: unknown) {
        await analytics.trackCommand('analyze', false, error instanceof Error ? error.message : 'unknown');
        if (error instanceof Error) {
          handleError(error);
        } else {
          handleError(new Error(String(error)));
        }
      }
    });
}; 