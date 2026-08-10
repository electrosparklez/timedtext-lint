#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { collectSubtitleFiles } from './files.js';
import { formatHuman, formatJson, summarize } from './formatters.js';
import { lintText } from './linter.js';
import { loadConfig } from './config.js';

interface Args {
  inputs: string[];
  format: 'human' | 'json';
  configPath?: string;
}

const HELP = `timedtext-lint - lint SRT and WebVTT subtitle files

Usage:
  timedtext-lint <file-or-directory> [...more paths] [options]

Options:
  --format human|json    Output format (default: human)
  --config <path>        Load a JSON configuration file
  -h, --help             Show this help

Examples:
  timedtext-lint subtitles/
  timedtext-lint movie.srt --format json
  timedtext-lint captions/ --config .timedtextlintrc.json
`;

function parseArgs(argv: string[]): Args | null {
  const args: Args = { inputs: [], format: 'human' };

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
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    args.inputs.push(arg);
  }

  if (args.inputs.length === 0) throw new Error('Provide at least one .srt/.vtt file or directory.');
  return args;
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args) {
      console.log(HELP);
      return;
    }

    const config = await loadConfig(args.configPath);
    const files = await collectSubtitleFiles(args.inputs);
    if (files.length === 0) throw new Error('No .srt or .vtt files found.');

    const results = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      results.push(lintText(source, file, config));
    }

    console.log(args.format === 'json' ? formatJson(results) : formatHuman(results));
    if (summarize(results).errors > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`timedtext-lint: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}

await main();
