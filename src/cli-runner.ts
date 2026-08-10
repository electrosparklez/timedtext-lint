import { readFile } from 'node:fs/promises';
import { discoverConfig, loadConfig } from './config.js';
import { collectSubtitleFiles } from './files.js';
import { formatHuman, formatJson, summarize } from './formatters.js';
import { lintText } from './linter.js';

interface Args {
  inputs: string[];
  format: 'human' | 'json';
  configPath?: string;
  configDiscovery: boolean;
}

export interface CliRunOptions {
  cwd?: string;
}

export interface CliIo {
  log(message: string): void;
  error(message: string): void;
}

const HELP = `timedtext-lint - lint SRT and WebVTT subtitle files

Usage:
  timedtext-lint <file-or-directory> [...more paths] [options]

Options:
  --format human|json     Output format (default: human)
  --config <path>         Load a JSON configuration file (overrides discovery)
  --no-config-discovery   Disable automatic configuration discovery
  -h, --help              Show this help

Examples:
  timedtext-lint subtitles/
  timedtext-lint movie.srt --format json
  timedtext-lint captions/ --config .timedtextlintrc.json
`;

function parseArgs(argv: string[]): Args | null {
  const args: Args = { inputs: [], format: 'human', configDiscovery: true };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return null;
    if (arg === '--format') {
      const value = argv[++index];
      if (value !== 'human' && value !== 'json') throw new Error('--format must be human or json.');
      args.format = value;
      continue;
    }
    if (arg === '--config') {
      const value = argv[++index];
      if (!value) throw new Error('--config requires a path.');
      args.configPath = value;
      continue;
    }
    if (arg === '--no-config-discovery') {
      args.configDiscovery = false;
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    args.inputs.push(arg);
  }

  if (args.inputs.length === 0)
    throw new Error('Provide at least one .srt/.vtt file or directory.');
  return args;
}

async function loadCliConfig(args: Args, cwd: string) {
  if (args.configPath) return loadConfig(args.configPath);
  if (!args.configDiscovery) return loadConfig();

  const discoveredPath = await discoverConfig(cwd);
  if (!discoveredPath) return loadConfig();

  try {
    return await loadConfig(discoveredPath);
  } catch (error) {
    throw new Error(
      `Discovered configuration "${discoveredPath}" is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function runCli(
  argv: string[],
  io: CliIo = console,
  options: CliRunOptions = {}
): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (!args) {
      io.log(HELP);
      return 0;
    }

    const config = await loadCliConfig(args, options.cwd ?? process.cwd());
    const files = await collectSubtitleFiles(args.inputs);
    if (files.length === 0) throw new Error('No .srt or .vtt files found.');

    const results = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      results.push(lintText(source, file, config));
    }

    io.log(args.format === 'json' ? formatJson(results) : formatHuman(results));
    return summarize(results).errors > 0 ? 1 : 0;
  } catch (error) {
    io.error(`timedtext-lint: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
