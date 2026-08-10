import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';
import { actionArgsFromEnvironment, runAction } from '../dist/action.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const goodFixture = fileURLToPath(new URL('./fixtures/good.srt', import.meta.url));
const brokenFixture = fileURLToPath(new URL('../examples/broken.srt', import.meta.url));
const configFixture = fileURLToPath(new URL('../.timedtextlintrc.example.json', import.meta.url));
const actionEntry = fileURLToPath(new URL('../dist/action.mjs', import.meta.url));

function quietIo() {
  return { log() {}, error() {} };
}

test('maps newline-separated paths and an optional config to CLI arguments', () => {
  assert.deepEqual(
    actionArgsFromEnvironment({
      INPUT_PATHS: 'captions/first file.srt\r\ncaptions/second.vtt\n',
      INPUT_CONFIG: ' .timedtextlintrc.json ',
    }),
    ['captions/first file.srt', 'captions/second.vtt', '--config', '.timedtextlintrc.json']
  );
});

test('returns CLI success, lint-error, and runtime-error exit codes unchanged', async () => {
  assert.equal(
    await runAction({ INPUT_PATHS: goodFixture, INPUT_CONFIG: configFixture }, quietIo()),
    0
  );
  assert.equal(await runAction({ INPUT_PATHS: brokenFixture }, quietIo()), 1);
  assert.equal(await runAction({ INPUT_PATHS: `${root}/missing.srt` }, quietIo()), 2);
  assert.equal(await runAction({}, quietIo()), 2);
});

test('action entry point propagates timedtext-lint process exit codes', () => {
  for (const [paths, expected] of [
    [goodFixture, 0],
    [brokenFixture, 1],
    [`${root}/missing.srt`, 2],
  ]) {
    const result = spawnSync(process.execPath, [actionEntry], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, INPUT_PATHS: paths },
    });
    assert.equal(result.status, expected, result.stderr || result.stdout);
  }
});

test('action config input takes priority over automatic discovery', async (context) => {
  const workingDirectory = await mkdtemp(join(tmpdir(), 'timedtext-lint-action-config-'));
  context.after(() => rm(workingDirectory, { recursive: true, force: true }));
  await writeFile(
    join(workingDirectory, '.timedtextlintrc.json'),
    JSON.stringify({ rules: { 'max-line-length': ['error', { max: 1 }] } })
  );
  const explicitConfig = join(workingDirectory, 'explicit.json');
  await writeFile(explicitConfig, '{}');

  const discoveredResult = spawnSync(process.execPath, [actionEntry], {
    cwd: workingDirectory,
    encoding: 'utf8',
    env: { ...process.env, INPUT_PATHS: goodFixture },
  });
  assert.equal(discoveredResult.status, 1, discoveredResult.stderr || discoveredResult.stdout);

  const explicitResult = spawnSync(process.execPath, [actionEntry], {
    cwd: workingDirectory,
    encoding: 'utf8',
    env: { ...process.env, INPUT_PATHS: goodFixture, INPUT_CONFIG: explicitConfig },
  });
  assert.equal(explicitResult.status, 0, explicitResult.stderr || explicitResult.stdout);
});
