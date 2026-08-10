# Changelog

## v0.3.0 - 2026-08-10

### Added

- Automatic discovery of the nearest `.timedtextlintrc.json` by searching upward from the current working directory.
- `--no-config-discovery` for running with built-in defaults when a configuration file is present.
- SARIF 2.1.0 output through `--format sarif`, including GitHub code-scanning-compatible rule, severity, path, and line metadata.
- A documented GitHub Actions workflow for generating and uploading SARIF reports.
- Fixture-based SARIF coverage for both SRT and WebVTT diagnostics.

### Changed

- Malformed or invalid automatically discovered configurations now produce actionable errors that identify the configuration file.
- Explicit `--config` paths continue to take priority over automatic discovery.

### Maintenance

- Enforced repository-wide LF line endings through `.gitattributes` across Windows, macOS, and Linux.
- Documented that Windows contributors can retain their normal global `core.autocrlf` setting.
- Expanded automated coverage for configuration discovery, SARIF output, bundle synchronization, and the first-class GitHub Action.

### Compatibility

- Existing human and JSON output remain compatible, and lint exit-code semantics are unchanged.

## v0.2.0 - 2026-08-10

### Added

- First-class GitHub Action support for linting SRT and WebVTT files in repository workflows.
- Required `paths` input for one or more files or directories, plus an optional `config` path input.
- Node 24 action runtime with a committed, bundled `dist/action.mjs` artifact.
- GitHub Actions smoke testing that runs the local action entry point against a valid subtitle fixture.

### Compatibility

- Existing CLI and library behavior remains compatible; the action delegates to the same lint execution and exit-code behavior.
