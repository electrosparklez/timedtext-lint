import {
  malformedTimestampIssue,
  parseSrtTimestamp,
  parseTimingLine,
  splitBlocks,
} from './common.js';
import type { Cue, ParseResult } from '../types.js';

export function parseSrt(source: string, file: string): ParseResult {
  const cues: Cue[] = [];
  const issues: ParseResult['issues'] = [];

  for (const block of splitBlocks(source)) {
    let timingIndex = 0;
    let id: string | undefined;

    if (/^\d+$/.test(block.lines[0]?.trim() ?? '') && block.lines.length > 1) {
      id = block.lines[0].trim();
      timingIndex = 1;
    }

    const timingLine = block.lines[timingIndex] ?? '';
    const timing = parseTimingLine(timingLine, parseSrtTimestamp);
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
