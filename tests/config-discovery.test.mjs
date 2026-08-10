import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from '../dist/cli-runner.js';
import { CONFIG_FILENAME, discoverConfig } from '../dist/index.js';

const subtitleSource = `1\n00:00:01,000 --> 00:00:03,000\nHello\n`;
const strictConfig = JSON.stringify({
  rules: {
    'max-line-length': ['error', { max: 1 }],
    'maximum-reading-speed': 'off',
  },
});

async function createWorkspace(context) {
  const root = await mkdtemp(join(tmpdir(), 'timedtext-lint-config-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const subtitle = join(root, 'sample.srt');
  await writeFile(subtitle, subtitleSource);
  return { root, subtitle };
}

function captureIo() {
  const logs = [];
  const errors = [];
  return {
    errors,
    io: {
      log(message) {
        logs.push(message);
      },
      error(message) {
        errors.push(message);
      },
    },
    logs,
  };
}

test('uses the nearest discovered configuration', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  const packageDirectory = join(root, 'packages', 'captions');
  const workingDirectory = join(packageDirectory, 'nested');
  await mkdir(workingDirectory, { recursive: true });
  await writeFile(join(root, CONFIG_FILENAME), strictConfig);
  const nearest = join(packageDirectory, CONFIG_FILENAME);
  await writeFile(nearest, '{}');

  assert.equal(await discoverConfig(workingDirectory), nearest);
  const output = captureIo();
  assert.equal(await runCli([subtitle], output.io, { cwd: workingDirectory }), 0);
  assert.deepEqual(output.errors, []);
});

test('searches upward from the working directory', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  const workingDirectory = join(root, 'packages', 'captions');
  await mkdir(workingDirectory, { recursive: true });
  const configPath = join(root, CONFIG_FILENAME);
  await writeFile(configPath, strictConfig);

  assert.equal(await discoverConfig(workingDirectory), configPath);
  assert.equal(await runCli([subtitle], captureIo().io, { cwd: workingDirectory }), 1);
});

test('gives an explicit config path priority over discovery', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  const workingDirectory = join(root, 'nested');
  await mkdir(workingDirectory);
  await writeFile(join(root, CONFIG_FILENAME), '{ malformed');
  const explicitConfig = join(root, 'explicit.json');
  await writeFile(explicitConfig, '{}');
  const output = captureIo();

  assert.equal(
    await runCli([subtitle, '--config', explicitConfig], output.io, { cwd: workingDirectory }),
    0
  );
  assert.deepEqual(output.errors, []);
});

test('can disable automatic config discovery', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  await writeFile(join(root, CONFIG_FILENAME), '{ malformed');
  const output = captureIo();

  assert.equal(await runCli([subtitle, '--no-config-discovery'], output.io, { cwd: root }), 0);
  assert.deepEqual(output.errors, []);
});

test('preserves default behavior when no config exists', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  const workingDirectory = join(root, 'nested');
  await mkdir(workingDirectory);
  const output = captureIo();

  assert.equal(await discoverConfig(workingDirectory), undefined);
  assert.equal(await runCli([subtitle], output.io, { cwd: workingDirectory }), 0);
  assert.deepEqual(output.errors, []);
});

test('reports malformed discovered configuration files', async (context) => {
  const { root, subtitle } = await createWorkspace(context);
  const configPath = join(root, CONFIG_FILENAME);
  await writeFile(configPath, '{ malformed');
  const output = captureIo();

  assert.equal(await runCli([subtitle], output.io, { cwd: root }), 2);
  assert.equal(output.errors.length, 1);
  assert(output.errors[0].includes(`Discovered configuration "${configPath}" is invalid:`));
});
