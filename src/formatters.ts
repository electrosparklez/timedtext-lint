import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LintResult } from './types.js';

const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
const SARIF_VERSION = '2.1.0';
const SARIF_SOURCE_ROOT = '%SRCROOT%';
const TOOL_NAME = 'timedtext-lint';
const TOOL_INFORMATION_URI = 'https://github.com/electrosparklez/timedtext-lint';

type SarifLevel = 'error' | 'warning';

function toSarifLevel(severity: 'error' | 'warning'): SarifLevel {
  return severity;
}

function ruleDescription(ruleId: string): string {
  const words = ruleId.replaceAll('-', ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function directoryUri(directory: string): string {
  const uri = pathToFileURL(resolve(directory)).href;
  return uri.endsWith('/') ? uri : `${uri}/`;
}

function relativeUri(path: string): string {
  return path
    .split(/[\\/]+/)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function artifactLocation(file: string, sourceRoot: string) {
  const root = resolve(sourceRoot);
  const absolute = isAbsolute(file) ? file : resolve(root, file);
  const path = relative(root, absolute);

  if (path && !isAbsolute(path)) {
    return { uri: relativeUri(path), uriBaseId: SARIF_SOURCE_ROOT };
  }
  return { uri: pathToFileURL(absolute).href };
}

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

export function formatSarif(results: LintResult[], sourceRoot = process.cwd()): string {
  const issues = results.flatMap((result) => result.issues);
  const ruleLevels = new Map<string, SarifLevel>();
  for (const item of issues) {
    const level = toSarifLevel(item.severity);
    if (level === 'error' || !ruleLevels.has(item.ruleId)) ruleLevels.set(item.ruleId, level);
  }

  const rules = [...ruleLevels.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ruleId, level]) => ({
      id: ruleId,
      shortDescription: { text: ruleDescription(ruleId) },
      defaultConfiguration: { level },
    }));

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: TOOL_INFORMATION_URI,
            rules,
          },
        },
        originalUriBaseIds: {
          [SARIF_SOURCE_ROOT]: { uri: directoryUri(sourceRoot) },
        },
        results: issues.map((item) => ({
          ruleId: item.ruleId,
          level: toSarifLevel(item.severity),
          message: { text: item.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: artifactLocation(item.file, sourceRoot),
                region: { startLine: Math.max(1, item.line) },
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
