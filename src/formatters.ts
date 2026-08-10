import { relative } from 'node:path';
import type { LintResult } from './types.js';

export function summarize(results: LintResult[]) {
  const issues = results.flatMap((result) => result.issues);
  return {
    files: results.length,
    cues: results.reduce((total, result) => total + result.cueCount, 0),
    errors: issues.filter((item) => item.severity === 'error').length,
    warnings: issues.filter((item) => item.severity === 'warning').length,
  };
}

export function formatHuman(results: LintResult[]): string {
  const chunks: string[] = [];
  for (const result of results) {
    if (result.issues.length === 0) continue;
    chunks.push(relative(process.cwd(), result.file) || result.file);
    for (const item of result.issues) {
      chunks.push(
        `  ${String(item.line).padStart(4)}  ${item.severity.padEnd(7)}  ${item.message}  ${item.ruleId}`
      );
    }
    chunks.push('');
  }

  const summary = summarize(results);
  const mark = summary.errors > 0 ? '✖' : '✓';
  chunks.push(
    `${mark} ${summary.errors} error${summary.errors === 1 ? '' : 's'}, ${summary.warnings} warning${summary.warnings === 1 ? '' : 's'} across ${summary.files} file${summary.files === 1 ? '' : 's'}.`
  );
  return chunks.join('\n');
}

export function formatJson(results: LintResult[]): string {
  return JSON.stringify({ results, summary: summarize(results) }, null, 2);
}
