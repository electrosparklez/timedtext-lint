#!/usr/bin/env node

// src/cli-runner.ts
import { readFile as readFile2 } from "node:fs/promises";

// src/config.ts
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

// src/rules/helpers.ts
function issue(context, cue, ruleId, message) {
  return {
    file: context.file,
    ruleId,
    severity: context.severity,
    message,
    line: cue.line,
    cueIndex: cue.index
  };
}
function numberOption(options, key, fallback) {
  const value = options[key];
  return Number.isFinite(value) ? value : fallback;
}

// src/rules/duplicate-cue.ts
var duplicateCueRule = {
  id: "duplicate-cue",
  defaultConfig: "warning",
  run(context) {
    const seen = /* @__PURE__ */ new Map();
    const issues = [];
    for (const cue of context.cues) {
      const normalized = cue.text.replace(/\s+/g, " ").trim();
      const key = `${cue.startMs}:${cue.endMs}:${normalized}`;
      const previousIndex = seen.get(key);
      if (previousIndex !== void 0) {
        issues.push(issue(context, cue, this.id, `Cue duplicates cue ${previousIndex} exactly.`));
      } else {
        seen.set(key, cue.index);
      }
    }
    return issues;
  }
};

// src/rules/empty-cue.ts
var emptyCueRule = {
  id: "empty-cue",
  defaultConfig: "warning",
  run(context) {
    return context.cues.filter((cue) => cue.text.trim() === "").map((cue) => issue(context, cue, this.id, "Cue contains no text."));
  }
};

// src/rules/end-before-start.ts
var endBeforeStartRule = {
  id: "end-before-start",
  defaultConfig: "error",
  run(context) {
    return context.cues.filter((cue) => cue.endMs < cue.startMs).map((cue) => issue(context, cue, this.id, "Cue ends before it starts."));
  }
};

// src/rules/max-line-length.ts
var maxLineLengthRule = {
  id: "max-line-length",
  defaultConfig: ["warning", { max: 42 }],
  run(context) {
    const max = numberOption(context.options, "max", 42);
    const issues = [];
    for (const cue of context.cues) {
      cue.lines.forEach((line, lineOffset) => {
        if (line.length > max) {
          issues.push({
            ...issue(
              context,
              cue,
              this.id,
              `Line has ${line.length} characters; maximum is ${max}.`
            ),
            line: cue.line + 1 + lineOffset
          });
        }
      });
    }
    return issues;
  }
};

// src/rules/max-lines.ts
var maxLinesRule = {
  id: "max-lines",
  defaultConfig: ["warning", { max: 2 }],
  run(context) {
    const max = numberOption(context.options, "max", 2);
    return context.cues.filter((cue) => cue.lines.length > max).map(
      (cue) => issue(context, cue, this.id, `Cue has ${cue.lines.length} lines; maximum is ${max}.`)
    );
  }
};

// src/rules/maximum-reading-speed.ts
function readableCharacterCount(text) {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().length;
}
var maximumReadingSpeedRule = {
  id: "maximum-reading-speed",
  defaultConfig: ["warning", { maxCharsPerSecond: 20 }],
  run(context) {
    const max = numberOption(context.options, "maxCharsPerSecond", 20);
    const issues = [];
    for (const cue of context.cues) {
      const durationMs = cue.endMs - cue.startMs;
      if (durationMs <= 0 || cue.text.trim() === "") continue;
      const cps = readableCharacterCount(cue.text) / (durationMs / 1e3);
      if (cps > max) {
        issues.push(
          issue(
            context,
            cue,
            this.id,
            `Reading speed is ${cps.toFixed(1)} characters/sec; maximum is ${max}.`
          )
        );
      }
    }
    return issues;
  }
};

// src/rules/minimum-duration.ts
var minimumDurationRule = {
  id: "minimum-duration",
  defaultConfig: ["warning", { minMs: 500 }],
  run(context) {
    const minMs = numberOption(context.options, "minMs", 500);
    return context.cues.filter((cue) => cue.endMs > cue.startMs && cue.endMs - cue.startMs < minMs).map(
      (cue) => issue(
        context,
        cue,
        this.id,
        `Cue lasts ${cue.endMs - cue.startMs}ms; minimum is ${minMs}ms.`
      )
    );
  }
};

// src/rules/overlapping-cues.ts
var overlappingCuesRule = {
  id: "overlapping-cues",
  defaultConfig: "error",
  run(context) {
    const issues = [];
    for (let index = 1; index < context.cues.length; index += 1) {
      const previous = context.cues[index - 1];
      const current = context.cues[index];
      if (current.startMs < previous.endMs) {
        issues.push(
          issue(
            context,
            current,
            this.id,
            `Cue overlaps cue ${previous.index} by ${previous.endMs - current.startMs}ms.`
          )
        );
      }
    }
    return issues;
  }
};

// src/rules/zero-duration.ts
var zeroDurationRule = {
  id: "zero-duration",
  defaultConfig: "warning",
  run(context) {
    return context.cues.filter((cue) => cue.endMs === cue.startMs).map((cue) => issue(context, cue, this.id, "Cue has zero duration."));
  }
};

// src/rules/index.ts
var rules = [
  endBeforeStartRule,
  overlappingCuesRule,
  zeroDurationRule,
  emptyCueRule,
  duplicateCueRule,
  maxLinesRule,
  maxLineLengthRule,
  minimumDurationRule,
  maximumReadingSpeedRule
];
function resolveRuleConfig(rule, config) {
  const value = config.rules?.[rule.id] ?? rule.defaultConfig;
  if (Array.isArray(value)) {
    return { severity: value[0], options: value[1] ?? {} };
  }
  return { severity: value, options: {} };
}
function knownRuleIds() {
  return ["malformed-timestamp", ...rules.map((rule) => rule.id)];
}

// src/config.ts
var CONFIG_FILENAME = ".timedtextlintrc.json";
var severities = /* @__PURE__ */ new Set(["off", "warning", "error"]);
async function discoverConfig(startDirectory = process.cwd()) {
  let directory = resolve(startDirectory);
  while (true) {
    const candidate = join(directory, CONFIG_FILENAME);
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch (error) {
      const code = error.code;
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        throw new Error(
          `Unable to search for ${CONFIG_FILENAME} at "${candidate}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    const parent = dirname(directory);
    if (parent === directory) return void 0;
    directory = parent;
  }
}
function assertRuleValue(ruleId, value) {
  if (typeof value === "string" && severities.has(value)) return;
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && severities.has(value[0]) && typeof value[1] === "object" && value[1] !== null && !Array.isArray(value[1]) && Object.values(value[1]).every((item) => typeof item === "number")) {
    return;
  }
  throw new Error(`Invalid configuration for rule "${ruleId}".`);
}
async function loadConfig(path) {
  if (!path) return {};
  const absolute = resolve(path);
  const raw = await readFile(absolute, "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Configuration must be a JSON object.");
  }
  const config = parsed;
  if (config.rules !== void 0) {
    if (typeof config.rules !== "object" || config.rules === null || Array.isArray(config.rules)) {
      throw new Error('"rules" must be an object.');
    }
    const known = new Set(knownRuleIds());
    for (const [ruleId, value] of Object.entries(config.rules)) {
      if (!known.has(ruleId)) throw new Error(`Unknown rule "${ruleId}".`);
      assertRuleValue(ruleId, value);
    }
  }
  return config;
}

// src/files.ts
import { readdir, stat as stat2 } from "node:fs/promises";
import { extname, join as join2, resolve as resolve2 } from "node:path";
var SUPPORTED = /* @__PURE__ */ new Set([".srt", ".vtt"]);
async function collectSubtitleFiles(inputs) {
  const files = [];
  async function visit(input) {
    const path = resolve2(input);
    const info = await stat2(path);
    if (info.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await visit(join2(path, entry.name));
      }
      return;
    }
    if (info.isFile() && SUPPORTED.has(extname(path).toLowerCase())) files.push(path);
  }
  for (const input of inputs) await visit(input);
  return files.sort();
}

// src/formatters.ts
import { relative } from "node:path";
function summarize(results) {
  const issues = results.flatMap((result) => result.issues);
  return {
    files: results.length,
    cues: results.reduce((total, result) => total + result.cueCount, 0),
    errors: issues.filter((item) => item.severity === "error").length,
    warnings: issues.filter((item) => item.severity === "warning").length
  };
}
function formatHuman(results) {
  const chunks = [];
  for (const result of results) {
    if (result.issues.length === 0) continue;
    chunks.push(relative(process.cwd(), result.file) || result.file);
    for (const item of result.issues) {
      chunks.push(
        `  ${String(item.line).padStart(4)}  ${item.severity.padEnd(7)}  ${item.message}  ${item.ruleId}`
      );
    }
    chunks.push("");
  }
  const summary = summarize(results);
  const mark = summary.errors > 0 ? "\u2716" : "\u2713";
  chunks.push(
    `${mark} ${summary.errors} error${summary.errors === 1 ? "" : "s"}, ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"} across ${summary.files} file${summary.files === 1 ? "" : "s"}.`
  );
  return chunks.join("\n");
}
function formatJson(results) {
  return JSON.stringify({ results, summary: summarize(results) }, null, 2);
}

// src/parsers/index.ts
import { extname as extname2 } from "node:path";

// src/parsers/common.ts
function toMilliseconds(hours, minutes, seconds, millis) {
  return (hours * 60 * 60 + minutes * 60 + seconds) * 1e3 + millis;
}
function parseSrtTimestamp(value) {
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value.trim());
  if (!match) return null;
  const [, h, m, s, ms] = match;
  const hours = Number(h);
  const minutes = Number(m);
  const seconds = Number(s);
  const millis = Number(ms);
  if (minutes > 59 || seconds > 59) return null;
  return toMilliseconds(hours, minutes, seconds, millis);
}
function parseVttTimestamp(value) {
  const trimmed = value.trim();
  const long = /^(\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/.exec(trimmed);
  if (long) {
    const [, h, m2, s2, ms2] = long;
    const hours = Number(h);
    const minutes2 = Number(m2);
    const seconds2 = Number(s2);
    const millis2 = Number(ms2);
    if (minutes2 > 59 || seconds2 > 59) return null;
    return toMilliseconds(hours, minutes2, seconds2, millis2);
  }
  const short = /^(\d{2}):(\d{2})\.(\d{3})$/.exec(trimmed);
  if (!short) return null;
  const [, m, s, ms] = short;
  const minutes = Number(m);
  const seconds = Number(s);
  const millis = Number(ms);
  if (seconds > 59) return null;
  return toMilliseconds(0, minutes, seconds, millis);
}
function parseTimingLine(value, parseTimestamp) {
  const match = /^\s*(\S+)\s*-->\s*(\S+)(?:\s+.*)?$/.exec(value);
  if (!match) return null;
  const startMs = parseTimestamp(match[1]);
  const endMs = parseTimestamp(match[2]);
  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}
function malformedTimestampIssue(file, line, value) {
  return {
    file,
    ruleId: "malformed-timestamp",
    severity: "error",
    line,
    message: value.includes("-->") ? `Malformed timestamp line: ${value.trim()}` : "Cue is missing a valid timestamp line."
  };
}
function splitBlocks(source) {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let startLine = 1;
  const flush = () => {
    if (current.some((line) => line.trim() !== "")) {
      blocks.push({ line: startLine, lines: current });
    }
    current = [];
  };
  lines.forEach((line, index) => {
    if (line.trim() === "") {
      flush();
      startLine = index + 2;
    } else {
      if (current.length === 0) startLine = index + 1;
      current.push(line);
    }
  });
  flush();
  return blocks;
}

// src/parsers/srt.ts
function parseSrt(source, file) {
  const cues = [];
  const issues = [];
  for (const block of splitBlocks(source)) {
    let timingIndex = 0;
    let id;
    if (/^\d+$/.test(block.lines[0]?.trim() ?? "") && block.lines.length > 1) {
      id = block.lines[0].trim();
      timingIndex = 1;
    }
    const timingLine = block.lines[timingIndex] ?? "";
    const timing = parseTimingLine(timingLine, parseSrtTimestamp);
    if (!timing) {
      issues.push(malformedTimestampIssue(file, block.line + timingIndex, timingLine));
      continue;
    }
    const textLines = block.lines.slice(timingIndex + 1);
    cues.push({
      index: cues.length + 1,
      id,
      startMs: timing.startMs,
      endMs: timing.endMs,
      text: textLines.join("\n"),
      lines: textLines,
      line: block.line + timingIndex
    });
  }
  return { cues, issues };
}

// src/parsers/vtt.ts
var NON_CUE_PREFIXES = ["NOTE", "STYLE", "REGION"];
function parseVtt(source, file) {
  const cues = [];
  const issues = [];
  const normalized = source.replace(/^\uFEFF/, "");
  const blocks = splitBlocks(normalized);
  for (const block of blocks) {
    const first = block.lines[0]?.trim() ?? "";
    if (first.startsWith("WEBVTT")) continue;
    if (NON_CUE_PREFIXES.some((prefix) => first === prefix || first.startsWith(`${prefix} `)))
      continue;
    let timingIndex = 0;
    let id;
    if (!first.includes("-->") && block.lines.length > 1) {
      id = first;
      timingIndex = 1;
    }
    const timingLine = block.lines[timingIndex] ?? "";
    const timing = parseTimingLine(timingLine, parseVttTimestamp);
    if (!timing) {
      issues.push(malformedTimestampIssue(file, block.line + timingIndex, timingLine));
      continue;
    }
    const textLines = block.lines.slice(timingIndex + 1);
    cues.push({
      index: cues.length + 1,
      id,
      startMs: timing.startMs,
      endMs: timing.endMs,
      text: textLines.join("\n"),
      lines: textLines,
      line: block.line + timingIndex
    });
  }
  return { cues, issues };
}

// src/parsers/index.ts
function detectFormat(file) {
  const ext = extname2(file).toLowerCase();
  if (ext === ".srt") return "srt";
  if (ext === ".vtt") return "vtt";
  throw new Error(`Unsupported subtitle format: ${ext || "(no extension)"}`);
}
function parseTimedText(source, file, format = detectFormat(file)) {
  return format === "srt" ? parseSrt(source, file) : parseVtt(source, file);
}

// src/linter.ts
function lintText(source, file, config = {}, format) {
  const resolvedFormat = format ?? detectFormat(file);
  const parsed = parseTimedText(source, file, resolvedFormat);
  const malformedConfig = config.rules?.["malformed-timestamp"] ?? "error";
  const malformedSeverity = Array.isArray(malformedConfig) ? malformedConfig[0] : malformedConfig;
  const issues = malformedSeverity === "off" ? [] : parsed.issues.map((item) => ({ ...item, severity: malformedSeverity }));
  for (const rule of rules) {
    const resolved = resolveRuleConfig(rule, config);
    if (resolved.severity === "off") continue;
    issues.push(
      ...rule.run({
        file,
        cues: parsed.cues,
        options: resolved.options,
        severity: resolved.severity
      })
    );
  }
  issues.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
  return { file, format: resolvedFormat, issues, cueCount: parsed.cues.length };
}

// src/cli-runner.ts
var HELP = `timedtext-lint - lint SRT and WebVTT subtitle files

Usage:
  timedtext-lint <file-or-directory> [...more paths] [options]

Options:
  --format human|json     Output format (default: human)
  --config <path>         Load a JSON configuration file (overrides discovery)
  --no-config-discovery   Disable automatic configuration discovery
  -h, --help              Show this help

Examples:
  timedtext-lint subtitles/
  timedtext-lint movie.srt --format json
  timedtext-lint captions/ --config .timedtextlintrc.json
`;
function parseArgs(argv) {
  const args = { inputs: [], format: "human", configDiscovery: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return null;
    if (arg === "--format") {
      const value = argv[++index];
      if (value !== "human" && value !== "json") throw new Error("--format must be human or json.");
      args.format = value;
      continue;
    }
    if (arg === "--config") {
      const value = argv[++index];
      if (!value) throw new Error("--config requires a path.");
      args.configPath = value;
      continue;
    }
    if (arg === "--no-config-discovery") {
      args.configDiscovery = false;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    args.inputs.push(arg);
  }
  if (args.inputs.length === 0)
    throw new Error("Provide at least one .srt/.vtt file or directory.");
  return args;
}
async function loadCliConfig(args, cwd) {
  if (args.configPath) return loadConfig(args.configPath);
  if (!args.configDiscovery) return loadConfig();
  const discoveredPath = await discoverConfig(cwd);
  if (!discoveredPath) return loadConfig();
  try {
    return await loadConfig(discoveredPath);
  } catch (error) {
    throw new Error(
      `Discovered configuration "${discoveredPath}" is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function runCli(argv, io = console, options = {}) {
  try {
    const args = parseArgs(argv);
    if (!args) {
      io.log(HELP);
      return 0;
    }
    const config = await loadCliConfig(args, options.cwd ?? process.cwd());
    const files = await collectSubtitleFiles(args.inputs);
    if (files.length === 0) throw new Error("No .srt or .vtt files found.");
    const results = [];
    for (const file of files) {
      const source = await readFile2(file, "utf8");
      results.push(lintText(source, file, config));
    }
    io.log(args.format === "json" ? formatJson(results) : formatHuman(results));
    return summarize(results).errors > 0 ? 1 : 0;
  } catch (error) {
    io.error(`timedtext-lint: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

// src/action.ts
function actionArgsFromEnvironment(environment) {
  const paths = (environment.INPUT_PATHS ?? "").split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
  if (paths.length === 0)
    throw new Error('Input "paths" must contain at least one file or directory.');
  const args = [...paths];
  const configPath = environment.INPUT_CONFIG?.trim();
  if (configPath) args.push("--config", configPath);
  return args;
}
async function runAction(environment = process.env, io = console) {
  try {
    return await runCli(actionArgsFromEnvironment(environment), io);
  } catch (error) {
    io.error(`timedtext-lint: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

// src/action-entry.ts
process.exitCode = await runAction();
