import { detectFormat, parseTimedText } from './parsers/index.js';
import { resolveRuleConfig, rules } from './rules/index.js';
import type { LintResult, SubtitleFormat, TimedTextConfig } from './types.js';

export function lintText(
  source: string,
  file: string,
  config: TimedTextConfig = {},
  format?: SubtitleFormat
): LintResult {
  const resolvedFormat = format ?? detectFormat(file);
  const parsed = parseTimedText(source, file, resolvedFormat);

  const malformedConfig = config.rules?.['malformed-timestamp'] ?? 'error';
  const malformedSeverity = Array.isArray(malformedConfig) ? malformedConfig[0] : malformedConfig;
  const issues =
    malformedSeverity === 'off'
      ? []
      : parsed.issues.map((item) => ({ ...item, severity: malformedSeverity }));

  for (const rule of rules) {
    const resolved = resolveRuleConfig(rule, config);
    if (resolved.severity === 'off') continue;
    issues.push(
      ...rule.run({
        file,
        cues: parsed.cues,
        options: resolved.options,
        severity: resolved.severity,
      })
    );
  }

  issues.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
  return { file, format: resolvedFormat, issues, cueCount: parsed.cues.length };
}
