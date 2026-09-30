// `pnpm dev` for the API: `wrangler dev`, plus the optional secrets from .dev.vars.
//
// Wrangler only loads the secrets named in `secrets.required` from .dev.vars, and the Whop
// ones are optional (payments stay off without them), so they're passed as `--var` here.
// Nothing changes for deploys, where they're real secrets (docs/payments.md).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OPTIONAL_SECRETS = ["WHOP_API_KEY", "WHOP_WEBHOOK_SECRET"];

const file = join(import.meta.dirname, "..", ".dev.vars");
const devVars = existsSync(file) ? readFileSync(file, "utf8") : "";

const args = ["dev"];
for (const name of OPTIONAL_SECRETS) {
  const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, "m").exec(devVars);
  const value = match?.[1]?.replace(/^(["'])(.*)\1$/, "$2");
  if (value) args.push("--var", `${name}:${value}`);
}
args.push(...process.argv.slice(2));

const child = spawn("wrangler", args, { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
