# Changelog

## v0.2.0 - 2026-08-10

### Added

- First-class GitHub Action support for linting SRT and WebVTT files in repository workflows.
- Required `paths` input for one or more files or directories, plus an optional `config` path input.
- Node 24 action runtime with a committed, bundled `dist/action.mjs` artifact.
- GitHub Actions smoke testing that runs the local action entry point against a valid subtitle fixture.

### Compatibility

- Existing CLI and library behavior remains compatible; the action delegates to the same lint execution and exit-code behavior.
