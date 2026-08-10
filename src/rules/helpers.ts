import type { Cue, LintIssue, RuleContext } from '../types.js';

export function issue(
  context: RuleContext,
  cue: Cue,
  ruleId: string,
  message: string
): LintIssue {
  return {
    file: context.file,
    ruleId,
    severity: context.severity,
    message,
    line: cue.line,
    cueIndex: cue.index,
  };
}

export function numberOption(options: Record<string, number>, key: string, fallback: number): number {
  const value = options[key];
  return Number.isFinite(value) ? value : fallback;
}
