import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { knownRuleIds } from './rules/index.js';
import type { RuleValue, Severity, TimedTextConfig } from './types.js';

export const CONFIG_FILENAME = '.timedtextlintrc.json';

const severities = new Set<Severity>(['off', 'warning', 'error']);

export async function discoverConfig(startDirectory = process.cwd()): Promise<string | undefined> {
  let directory = resolve(startDirectory);

  while (true) {
    const candidate = join(directory, CONFIG_FILENAME);
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw new Error(
          `Unable to search for ${CONFIG_FILENAME} at "${candidate}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function assertRuleValue(ruleId: string, value: unknown): asserts value is RuleValue {
  if (typeof value === 'string' && severities.has(value as Severity)) return;
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    severities.has(value[0] as Severity) &&
    typeof value[1] === 'object' &&
    value[1] !== null &&
    !Array.isArray(value[1]) &&
    Object.values(value[1]).every((item) => typeof item === 'number')
  ) {
    return;
  }
  throw new Error(`Invalid configuration for rule "${ruleId}".`);
}

export async function loadConfig(path?: string): Promise<TimedTextConfig> {
  if (!path) return {};
  const absolute = resolve(path);
  const raw = await readFile(absolute, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Configuration must be a JSON object.');
  }

  const config = parsed as TimedTextConfig;
  if (config.rules !== undefined) {
    if (typeof config.rules !== 'object' || config.rules === null || Array.isArray(config.rules)) {
      throw new Error('"rules" must be an object.');
    }
    const known = new Set(knownRuleIds());
    for (const [ruleId, value] of Object.entries(config.rules)) {
      if (!known.has(ruleId)) throw new Error(`Unknown rule "${ruleId}".`);
      assertRuleValue(ruleId, value);
    }
  }

  return config;
}
