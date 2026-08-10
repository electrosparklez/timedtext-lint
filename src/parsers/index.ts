import { extname } from 'node:path';
import { parseSrt } from './srt.js';
import { parseVtt } from './vtt.js';
import type { ParseResult, SubtitleFormat } from '../types.js';

export function detectFormat(file: string): SubtitleFormat {
  const ext = extname(file).toLowerCase();
  if (ext === '.srt') return 'srt';
  if (ext === '.vtt') return 'vtt';
  throw new Error(`Unsupported subtitle format: ${ext || '(no extension)'}`);
}

export function parseTimedText(source: string, file: string, format = detectFormat(file)): ParseResult {
  return format === 'srt' ? parseSrt(source, file) : parseVtt(source, file);
}
