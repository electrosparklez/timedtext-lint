# Contributing to timedtext-lint

Thanks for helping improve subtitle and caption quality.

## Development

1. Fork and clone the repository.
2. Run `npm install`.
3. Run `npm test` while developing.
4. Run `npm run check` before opening a pull request.

The repository's `.gitattributes` enforces LF line endings for text files on every operating system. Windows contributors can keep their normal global `core.autocrlf` setting; no repository-specific Git configuration is required.

The GitHub Action runs the generated `dist/action.mjs` bundle. `npm run build` refreshes it; include the updated bundle when changing action or lint behavior.

## Adding a lint rule

Create a module in `src/rules/` that implements `LintRule`, add it to `src/rules/index.ts`, and add tests that cover both valid and invalid cues.

Rules should be deterministic, offline, narrowly scoped, and produce actionable messages. Avoid silently modifying subtitle content in lint rules.

## Reporting bugs

Include a minimal subtitle snippet that reproduces the problem, the command you ran, and the behavior you expected. Remove private or copyrighted dialogue when possible.
