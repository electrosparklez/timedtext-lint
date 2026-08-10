import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { knownRuleIds } from './rules/index.js';
import type { RuleValue, Severity, TimedTextConfig } from './types.js';

const severities = new Set<Severity>(['off', 'warning', 'error']);

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
