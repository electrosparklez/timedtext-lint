import assert from 'node:assert/strict';
import { join, relative } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { runCli } from '../dist/cli-runner.js';

const root = process.cwd();
const fixtureDirectory = join(root, 'tests', 'fixtures', 'sarif');
const srtFixture = join(fixtureDirectory, 'diagnostic.srt');
const vttFixture = join(fixtureDirectory, 'diagnostic.vtt');
const goodFixture = join(root, 'tests', 'fixtures', 'good.srt');

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

async function runSarif(inputs) {
  const output = captureIo();
  const exitCode = await runCli([...inputs, '--format', 'sarif'], output.io);
  assert.equal(output.logs.length, 1);
  return { exitCode, output, sarif: JSON.parse(output.logs[0]) };
}

test('emits SARIF 2.1.0 for SRT and WebVTT diagnostics', async () => {
  const { exitCode, output, sarif } = await runSarif([srtFixture, vttFixture]);
  assert.equal(exitCode, 1);
  assert.deepEqual(output.errors, []);
  assert.equal(sarif.$schema, 'https://json.schemastore.org/sarif-2.1.0.json');
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs.length, 1);

  const run = sarif.runs[0];
  assert.equal(run.tool.driver.name, 'timedtext-lint');
  assert.match(run.originalUriBaseIds['%SRCROOT%'].uri, /^file:\/\//);
  assert.deepEqual(
    run.tool.driver.rules.map((rule) => rule.id),
    ['end-before-start', 'max-line-length']
  );

  const byRule = new Map(run.results.map((result) => [result.ruleId, result]));
  const srtResult = byRule.get('end-before-start');
  assert.equal(srtResult.level, 'error');
  assert.equal(srtResult.message.text, 'Cue ends before it starts.');
  assert.equal(
    srtResult.locations[0].physicalLocation.artifactLocation.uri,
    'tests/fixtures/sarif/diagnostic.srt'
  );
  assert.equal(srtResult.locations[0].physicalLocation.artifactLocation.uriBaseId, '%SRCROOT%');
  assert.equal(srtResult.locations[0].physicalLocation.region.startLine, 2);

  const vttResult = byRule.get('max-line-length');
  assert.equal(vttResult.level, 'warning');
  assert.equal(vttResult.message.text, 'Line has 43 characters; maximum is 42.');
  assert.equal(
    vttResult.locations[0].physicalLocation.artifactLocation.uri,
    'tests/fixtures/sarif/diagnostic.vtt'
  );
  assert.equal(vttResult.locations[0].physicalLocation.artifactLocation.uriBaseId, '%SRCROOT%');
  assert.equal(vttResult.locations[0].physicalLocation.region.startLine, 4);
});

test('preserves SARIF exit-code behavior', async () => {
  const valid = await runSarif([goodFixture]);
  assert.equal(valid.exitCode, 0);
  assert.deepEqual(valid.sarif.runs[0].results, []);

  const invalid = captureIo();
  assert.equal(
    await runCli([join(fixtureDirectory, 'missing.srt'), '--format', 'sarif'], invalid.io),
    2
  );
  assert.equal(invalid.logs.length, 0);
  assert.match(invalid.errors[0], /^timedtext-lint:/);
});

test('keeps human and JSON output behavior unchanged', async () => {
  const human = captureIo();
  assert.equal(await runCli([srtFixture, vttFixture, '--format', 'human'], human.io), 1);
  assert.deepEqual(human.errors, []);
  assert.equal(
    human.logs[0],
    [
      relative(root, srtFixture),
      '     2  error    Cue ends before it starts.  end-before-start',
      '',
      relative(root, vttFixture),
      '     4  warning  Line has 43 characters; maximum is 42.  max-line-length',
      '',
      '✖ 1 error, 1 warning across 2 files.',
    ].join('\n')
  );

  const json = captureIo();
  assert.equal(await runCli([srtFixture, vttFixture, '--format', 'json'], json.io), 1);
  assert.deepEqual(json.errors, []);
  const parsed = JSON.parse(json.logs[0]);
  assert.deepEqual(Object.keys(parsed), ['results', 'summary']);
  assert.deepEqual(parsed.summary, { files: 2, cues: 2, errors: 1, warnings: 1 });
  assert.deepEqual(
    parsed.results.map((result) => ({
      file: result.file,
      format: result.format,
      rules: result.issues.map((issue) => issue.ruleId),
    })),
    [
      { file: srtFixture, format: 'srt', rules: ['end-before-start'] },
      { file: vttFixture, format: 'vtt', rules: ['max-line-length'] },
    ]
  );
});
