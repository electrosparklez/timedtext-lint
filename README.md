# timedtext-lint

A fast, deterministic, CI-friendly linter for **SRT** and **WebVTT** subtitle/caption files.

`timedtext-lint` catches timing mistakes and readability problems before subtitle files ship.
It runs entirely offline and can be used as a CLI or as a TypeScript/JavaScript library.

> Status: early v0.1 development. Feedback, test files, and rule ideas are welcome.

## What it catches

- malformed timestamps
- cue end before cue start
- overlapping cues
- zero-duration cues
- empty cues
- exact duplicate cues
- too many lines in a cue
- overlong subtitle lines
- cues that are too short
- excessive reading speed

## Install

During local development:

```bash
npm install
npm run build
node dist/cli.js examples/broken.srt
```

After the package is published, the intended usage is:

```bash
npx timedtext-lint subtitles/
```

## GitHub Action

Use the action to lint subtitle files without adding a Node setup or install step to your workflow:

```yaml
name: Lint subtitles

on: [pull_request]

jobs:
  timedtext-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: electrosparklez/timedtext-lint@v0.2.0
        with:
          paths: |
            subtitles/
            captions/intro.vtt
          config: .timedtextlintrc.json
```

`paths` is required and accepts one file or directory per line. Paths are resolved from the checked-out repository, and directories are scanned recursively for `.srt` and `.vtt` files. `config` is optional and accepts the path to a JSON configuration file.

The step succeeds when there are no lint errors, fails with exit code `1` when lint errors are found, and fails with exit code `2` for invalid input, configuration, or runtime errors. See [the complete example workflow](.github/examples/timedtext-lint.yml).

## CLI

```text
timedtext-lint <file-or-directory> [...more paths] [options]

--format human|json    Output format (default: human)
--config <path>        Load a JSON configuration file
-h, --help             Show help
```

Directories are scanned recursively for `.srt` and `.vtt` files.

### Example output

```text
examples/broken.srt
     2  warning  Cue has 3 lines; maximum is 2.  max-lines
     2  warning  Reading speed is 52.5 characters/sec; maximum is 20.  maximum-reading-speed
     3  warning  Line has 66 characters; maximum is 42.  max-line-length
     8  error    Cue overlaps cue 1 by 300ms.  overlapping-cues
     8  warning  Cue lasts 200ms; minimum is 500ms.  minimum-duration
    12  error    Cue ends before it starts.  end-before-start

✖ 2 errors, 6 warnings across 1 file.
```

## Configuration

Create a JSON file such as `.timedtextlintrc.json`:

```json
{
  "rules": {
    "overlapping-cues": "error",
    "max-lines": ["warning", { "max": 2 }],
    "max-line-length": ["warning", { "max": 42 }],
    "minimum-duration": ["warning", { "minMs": 500 }],
    "maximum-reading-speed": ["warning", { "maxCharsPerSecond": 20 }]
  }
}
```

Then run:

```bash
timedtext-lint subtitles/ --config .timedtextlintrc.json
```

Every rule can be set to `"off"`, `"warning"`, or `"error"`. Rules with numeric options use the tuple form shown above.

## JSON output

```bash
timedtext-lint subtitles/ --format json
```

JSON output includes per-file issues and an aggregate summary, making it suitable for CI and editor integrations.

## Exit codes

- `0`: no errors (warnings may exist)
- `1`: one or more lint errors
- `2`: CLI/configuration/runtime failure

## Library API

```ts
import { lintText } from 'timedtext-lint';

const result = lintText(`1\n00:00:01,000 --> 00:00:02,000\nHello!\n`, 'example.srt');

console.log(result.issues);
```

## Why this project?

Subtitle mistakes are easy to miss in review because timing, line length, readability, and file syntax live in the same tiny text format. A linter turns those checks into repeatable, reviewable automation.

The project provides a small core that works locally, in CI, and through a first-class GitHub Action.

## Roadmap

- [x] SRT parsing
- [x] WebVTT parsing
- [x] modular lint rules
- [x] human-readable output
- [x] JSON output
- [x] JSON rule configuration
- [x] recursive directory scanning
- [x] CI test workflow
- [x] GitHub Action wrapper
- [ ] SARIF / GitHub code-scanning output
- [ ] safe `--fix` operations
- [ ] richer WebVTT validation
- [ ] documentation site and browser demo

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
