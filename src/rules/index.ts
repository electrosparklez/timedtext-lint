import { duplicateCueRule } from './duplicate-cue.js';
import { emptyCueRule } from './empty-cue.js';
import { endBeforeStartRule } from './end-before-start.js';
import { maxLineLengthRule } from './max-line-length.js';
import { maxLinesRule } from './max-lines.js';
import { maximumReadingSpeedRule } from './maximum-reading-speed.js';
import { minimumDurationRule } from './minimum-duration.js';
import { overlappingCuesRule } from './overlapping-cues.js';
import { zeroDurationRule } from './zero-duration.js';
import type { LintRule, ResolvedRuleConfig, RuleValue, TimedTextConfig } from '../types.js';

export const rules: LintRule[] = [
  endBeforeStartRule,
  overlappingCuesRule,
  zeroDurationRule,
  emptyCueRule,
  duplicateCueRule,
  maxLinesRule,
  maxLineLengthRule,
  minimumDurationRule,
  maximumReadingSpeedRule,
];

export function resolveRuleConfig(rule: LintRule, config: TimedTextConfig): ResolvedRuleConfig {
  const value: RuleValue = config.rules?.[rule.id] ?? rule.defaultConfig;
  if (Array.isArray(value)) {
    return { severity: value[0], options: value[1] ?? {} };
  }
  return { severity: value, options: {} };
}

export function knownRuleIds(): string[] {
  return ['malformed-timestamp', ...rules.map((rule) => rule.id)];
}
