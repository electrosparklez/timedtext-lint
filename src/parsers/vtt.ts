import {
  malformedTimestampIssue,
  parseTimingLine,
  parseVttTimestamp,
  splitBlocks,
} from './common.js';
import type { Cue, ParseResult } from '../types.js';

const NON_CUE_PREFIXES = ['NOTE', 'STYLE', 'REGION'];

export function parseVtt(source: string, file: string): ParseResult {
  const cues: Cue[] = [];
  const issues: ParseResult['issues'] = [];
  const normalized = source.replace(/^\uFEFF/, '');
  const blocks = splitBlocks(normalized);

  for (const block of blocks) {
    const first = block.lines[0]?.trim() ?? '';
    if (first.startsWith('WEBVTT')) continue;
    if (NON_CUE_PREFIXES.some((prefix) => first === prefix || first.startsWith(`${prefix} `)))
      continue;

    let timingIndex = 0;
    let id: string | undefined;
    if (!first.includes('-->') && block.lines.length > 1) {
      id = first;
      timingIndex = 1;
    }

    const timingLine = block.lines[timingIndex] ?? '';
    const timing = parseTimingLine(timingLine, parseVttTimestamp);
    if (!timing) {
      issues.push(malformedTimestampIssue(file, block.line + timingIndex, timingLine));
      continue;
    }

    const textLines = block.lines.slice(timingIndex + 1);
    cues.push({
      index: cues.length + 1,
      id,
      startMs: timing.startMs,
      endMs: timing.endMs,
      text: textLines.join('\n'),
      lines: textLines,
      line: block.line + timingIndex,
    });
  }

  return { cues, issues };
}
