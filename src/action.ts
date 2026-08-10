import { runCli, type CliIo } from './cli-runner.js';

export interface ActionEnvironment {
  INPUT_PATHS?: string;
  INPUT_CONFIG?: string;
}

export function actionArgsFromEnvironment(environment: ActionEnvironment): string[] {
  const paths = (environment.INPUT_PATHS ?? '')
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);

  if (paths.length === 0)
    throw new Error('Input "paths" must contain at least one file or directory.');

  const args = [...paths];
  const configPath = environment.INPUT_CONFIG?.trim();
  if (configPath) args.push('--config', configPath);
  return args;
}

export async function runAction(
  environment: ActionEnvironment = process.env,
  io: CliIo = console
): Promise<number> {
  try {
    return await runCli(actionArgsFromEnvironment(environment), io);
  } catch (error) {
    io.error(`timedtext-lint: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
