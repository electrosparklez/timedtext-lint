import assert from 'node:assert/strict';
import test from 'node:test';
import { lintText } from '../dist/index.js';

test('detects overlap, line count, line length, short duration, and reading speed', () => {
  const source = `1\n00:00:01,000 --> 00:00:01,300\nThis line is intentionally much longer than forty-two characters.\nsecond line\nthird line\n\n2\n00:00:01,200 --> 00:00:02,000\nHello\n`;
  const result = lintText(source, 'bad.srt');
  const ids = new Set(result.issues.map((item) => item.ruleId));
  assert(ids.has('overlapping-cues'));
  assert(ids.has('max-lines'));
  assert(ids.has('max-line-length'));
  assert(ids.has('minimum-duration'));
  assert(ids.has('maximum-reading-speed'));
});

test('detects backwards, zero-duration, empty, and duplicate cues', () => {
  const source = `1\n00:00:03,000 --> 00:00:02,000\nBackwards\n\n2\n00:00:04,000 --> 00:00:04,000\n\n3\n00:00:05,000 --> 00:00:07,000\nDuplicate\n\n4\n00:00:05,000 --> 00:00:07,000\nDuplicate\n`;
  const result = lintText(source, 'bad.srt');
  const ids = new Set(result.issues.map((item) => item.ruleId));
  assert(ids.has('end-before-start'));
  assert(ids.has('zero-duration'));
  assert(ids.has('empty-cue'));
  assert(ids.has('duplicate-cue'));
});

test('allows individual rules to be disabled or configured', () => {
  const source = `1\n00:00:01,000 --> 00:00:03,000\n1234567890\n`;
  const result = lintText(source, 'config.srt', {
    rules: {
      'max-line-length': ['error', { max: 5 }],
      'maximum-reading-speed': 'off',
    },
  });
  const issue = result.issues.find((item) => item.ruleId === 'max-line-length');
  assert.equal(issue?.severity, 'error');
  assert(!result.issues.some((item) => item.ruleId === 'maximum-reading-speed'));
});

test('allows malformed timestamp diagnostics to be disabled', () => {
  const source = `1\n00:99:01,000 --> 00:00:03,000\nBroken\n`;
  const result = lintText(source, 'bad.srt', { rules: { 'malformed-timestamp': 'off' } });
  assert.equal(result.issues.length, 0);
});
