import { spawn } from "node:child_process";

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  /** Capture stdout without printing it (for `--json` output). */
  quiet?: boolean;
  /** Capture stdout and print it as it arrives. */
  tee?: boolean;
  /** Resolve instead of throwing on a non-zero exit. */
  allowFailure?: boolean;
}

export interface RunResult {
  code: number;
  stdout: string;
}

/** Runs a command, inheriting the terminal unless its output needs to be read. */
export function run(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const capture = Boolean(options.quiet || options.tee);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["inherit", capture ? "pipe" : "inherit", options.quiet ? "pipe" : "inherit"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (options.tee) process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code: code ?? 1, stdout };
      if (result.code === 0 || options.allowFailure) {
        resolve(result);
        return;
      }
      if (stderr) process.stderr.write(stderr);
      reject(new Error(`\`${command} ${args.join(" ")}\` exited with code ${result.code}.`));
    });
  });
}
