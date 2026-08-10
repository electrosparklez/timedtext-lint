import type { LintIssue } from '../types.js';

export interface TimestampPair {
  startMs: number;
  endMs: number;
}

function toMilliseconds(hours: number, minutes: number, seconds: number, millis: number): number {
  return (hours * 60 * 60 + minutes * 60 + seconds) * 1000 + millis;
}

export function parseSrtTimestamp(value: string): number | null {
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value.trim());
  if (!match) return null;

  const [, h, m, s, ms] = match;
  const hours = Number(h);
  const minutes = Number(m);
  const seconds = Number(s);
  const millis = Number(ms);

  if (minutes > 59 || seconds > 59) return null;
  return toMilliseconds(hours, minutes, seconds, millis);
}

export function parseVttTimestamp(value: string): number | null {
  const trimmed = value.trim();
  const long = /^(\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/.exec(trimmed);
  if (long) {
    const [, h, m, s, ms] = long;
    const hours = Number(h);
    const minutes = Number(m);
    const seconds = Number(s);
    const millis = Number(ms);
    if (minutes > 59 || seconds > 59) return null;
    return toMilliseconds(hours, minutes, seconds, millis);
  }

  const short = /^(\d{2}):(\d{2})\.(\d{3})$/.exec(trimmed);
  if (!short) return null;
  const [, m, s, ms] = short;
  const minutes = Number(m);
  const seconds = Number(s);
  const millis = Number(ms);
  if (seconds > 59) return null;
  return toMilliseconds(0, minutes, seconds, millis);
}

export function parseTimingLine(
  value: string,
  parseTimestamp: (value: string) => number | null
): TimestampPair | null {
  const match = /^\s*(\S+)\s*-->\s*(\S+)(?:\s+.*)?$/.exec(value);
  if (!match) return null;

  const startMs = parseTimestamp(match[1]);
  const endMs = parseTimestamp(match[2]);
  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}

export function malformedTimestampIssue(file: string, line: number, value: string): LintIssue {
  return {
    file,
    ruleId: 'malformed-timestamp',
    severity: 'error',
    line,
    message: value.includes('-->')
      ? `Malformed timestamp line: ${value.trim()}`
      : 'Cue is missing a valid timestamp line.',
  };
}

export interface LineBlock {
  line: number;
  lines: string[];
}

export function splitBlocks(source: string): LineBlock[] {
  const lines = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const blocks: LineBlock[] = [];
  let current: string[] = [];
  let startLine = 1;

  const flush = () => {
    if (current.some((line) => line.trim() !== '')) {
      blocks.push({ line: startLine, lines: current });
    }
    current = [];
  };

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      flush();
      startLine = index + 2;
    } else {
      if (current.length === 0) startLine = index + 1;
      current.push(line);
    }
  });
  flush();

  return blocks;
}
