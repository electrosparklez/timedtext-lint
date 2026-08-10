import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTimedText } from '../dist/index.js';

test('parses ordinary SRT cues', () => {
  const source = `1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,250 --> 00:00:05,500\nSecond cue\n`;
  const result = parseTimedText(source, 'sample.srt', 'srt');
  assert.equal(result.issues.length, 0);
  assert.equal(result.cues.length, 2);
  assert.equal(result.cues[0].startMs, 1000);
  assert.equal(result.cues[1].endMs, 5500);
});

test('reports malformed SRT timestamps without crashing', () => {
  const source = `1\n00:61:01,000 --> 00:00:03,000\nBroken\n`;
  const result = parseTimedText(source, 'broken.srt', 'srt');
  assert.equal(result.cues.length, 0);
  assert.equal(result.issues[0]?.ruleId, 'malformed-timestamp');
});

test('parses WebVTT cue identifiers and settings', () => {
  const source = `WEBVTT\n\nintro\n00:01.000 --> 00:03.000 align:start position:10%\nHello VTT\n`;
  const result = parseTimedText(source, 'sample.vtt', 'vtt');
  assert.equal(result.issues.length, 0);
  assert.equal(result.cues[0].id, 'intro');
  assert.equal(result.cues[0].startMs, 1000);
});
