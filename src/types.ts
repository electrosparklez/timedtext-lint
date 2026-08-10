export type SubtitleFormat = 'srt' | 'vtt';
export type Severity = 'off' | 'warning' | 'error';

export interface Cue {
  index: number;
  id?: string;
  startMs: number;
  endMs: number;
  text: string;
  lines: string[];
  line: number;
}

export interface LintIssue {
  file: string;
  ruleId: string;
  severity: Exclude<Severity, 'off'>;
  message: string;
  line: number;
  cueIndex?: number;
}

export interface ParseResult {
  cues: Cue[];
  issues: LintIssue[];
}

export type RuleValue = Severity | [Severity, Record<string, number>];

export interface TimedTextConfig {
  rules?: Record<string, RuleValue>;
}

export interface ResolvedRuleConfig {
  severity: Severity;
  options: Record<string, number>;
}

export interface RuleContext {
  file: string;
  cues: Cue[];
  options: Record<string, number>;
  severity: Exclude<Severity, 'off'>;
}

export interface LintRule {
  id: string;
  defaultConfig: RuleValue;
  run(context: RuleContext): LintIssue[];
}

export interface LintResult {
  file: string;
  format: SubtitleFormat;
  issues: LintIssue[];
  cueCount: number;
}
