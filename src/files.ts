import { readdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const SUPPORTED = new Set(['.srt', '.vtt']);

export async function collectSubtitleFiles(inputs: string[]): Promise<string[]> {
  const files: string[] = [];

  async function visit(input: string): Promise<void> {
    const path = resolve(input);
    const info = await stat(path);
    if (info.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        await visit(join(path, entry.name));
      }
      return;
    }
    if (info.isFile() && SUPPORTED.has(extname(path).toLowerCase())) files.push(path);
  }

  for (const input of inputs) await visit(input);
  return files.sort();
}
