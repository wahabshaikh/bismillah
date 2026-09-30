// One-command deploy: `pnpm run deploy` from the repo root. See docs/deploy.md.
//
// 1. Signs in to Cloudflare (or uses CLOUDFLARE_API_TOKEN).
// 2. Creates the D1 database if it is missing and applies migrations, before any code ships.
// 3. Uploads required secrets the API does not have yet (prompting, or from the environment).
// 4. Deploys the API. Wrangler creates the KV namespace, R2 bucket and queue on first deploy.
// 5. Builds the web app against the API's URL and deploys it.
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { parse } from "jsonc-parser";
import {
  domainTarget,
  missingSecrets,
  normalizeDomain,
  type Options,
  parseArgs,
  parseWorkersDevSubdomain,
  type Target,
  trustedOrigins,
  workersDevTarget,
} from "./plan.ts";
import { run } from "./run.ts";

const root = join(import.meta.dirname, "../../..");
const apiDir = join(root, "apps/api");
const webDir = join(root, "apps/web");
const stateFile = join(root, ".deploy.json");
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

interface State {
  /** The domain the last deploy used, or null for workers.dev. */
  domain?: string | null;
  /** The account's workers.dev subdomain, learned from the first workers.dev deploy. */
  workersSubdomain?: string;
}

interface WorkerConfig {
  name: string;
  vars?: Record<string, string>;
  secrets?: { required?: string[] };
  d1_databases?: { binding: string; database_name?: string }[];
}

const USAGE = `Usage: pnpm run deploy [--domain example.com | --workers-dev] [--dry-run]

  --domain <domain>  Serve the API on api.<domain> and the web app on app.<domain>.
                     The domain must be a zone on your Cloudflare account.
  --workers-dev      Use the free *.workers.dev URLs instead of your own domain.
  --dry-run          Build and bundle everything without touching your account.

Answers are saved to .deploy.json, so later deploys need no flags. In CI, set
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and DEPLOY_DOMAIN, plus each required secret
(e.g. BETTER_AUTH_SECRET) for the first deploy.`;

function step(message: string) {
  console.log(`\n\u001b[1m▸ ${message}\u001b[0m`);
}

function readJsonc<T>(file: string): T {
  return parse(readFileSync(file, "utf8"), [], { allowTrailingComma: true }) as T;
}

function loadState(): State {
  return existsSync(stateFile) ? (JSON.parse(readFileSync(stateFile, "utf8")) as State) : {};
}

function saveState(state: State) {
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

async function ask(question: string, { secret = false } = {}): Promise<string> {
  // For secrets, echo nothing: readline writes typed characters to `output`.
  const output = secret
    ? new Writable({ write: (_chunk, _encoding, done) => done() })
    : process.stdout;
  if (secret) process.stdout.write(question);
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  // Raw mode turns Ctrl+C into a readline event, so exit on it as the shell would.
  rl.on("SIGINT", () => process.exit(130));
  try {
    const answer = await rl.question(secret ? "" : question);
    if (secret) process.stdout.write("\n");
    return answer.trim();
  } finally {
    rl.close();
  }
}

/** Runs Wrangler from an app's directory, so it picks up that app's config and version. */
function wrangler(cwd: string, args: string[], options: Parameters<typeof run>[2] = {}) {
  return run("pnpm", ["exec", "wrangler", ...args], { cwd, ...options });
}

async function signIn() {
  step("Checking your Cloudflare login");
  const whoami = await wrangler(apiDir, ["whoami", "--json"], { quiet: true, allowFailure: true });
  let info = safeJson<{ loggedIn?: boolean; accounts?: { id: string; name: string }[] }>(
    whoami.stdout,
  );
  if (!info?.loggedIn) {
    if (!interactive) {
      throw new Error(
        "Not logged in to Cloudflare. Set CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID), or run this in a terminal.",
      );
    }
    await wrangler(apiDir, ["login"]);
    const retry = await wrangler(apiDir, ["whoami", "--json"], { quiet: true });
    info = safeJson(retry.stdout);
  }

  // Wrangler asks which account to use on every command when there are several; ask once here.
  const accounts = info?.accounts ?? [];
  if (!process.env["CLOUDFLARE_ACCOUNT_ID"] && accounts.length > 1) {
    if (!interactive)
      throw new Error("Several Cloudflare accounts found. Set CLOUDFLARE_ACCOUNT_ID.");
    for (const [i, account] of accounts.entries()) {
      console.log(`  ${i + 1}. ${account.name} (${account.id})`);
    }
    const choice = Number(
      await ask(`Which account should this deploy to? [1-${accounts.length}] `),
    );
    const account = accounts[choice - 1];
    if (!account) throw new Error("No account picked.");
    process.env["CLOUDFLARE_ACCOUNT_ID"] = account.id;
  }
  const account =
    accounts.find((a) => a.id === process.env["CLOUDFLARE_ACCOUNT_ID"]) ?? accounts[0];
  if (account) console.log(`Deploying to ${account.name}.`);
}

function safeJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

async function chooseDomain(options: Options, state: State): Promise<string | null> {
  if (options.workersDev) return null;
  const given = options.domain ?? process.env["DEPLOY_DOMAIN"];
  if (given !== undefined) return given.trim() === "" ? null : normalizeDomain(given);
  if (state.domain !== undefined) return state.domain;
  if (options.dryRun || !interactive) return options.dryRun ? "example.com" : null;

  console.log(
    "\nThe web app signs in with a cookie set by the API, so both need to be on the same domain.",
  );
  console.log("With your own domain the API goes on api.<domain> and the web app on app.<domain>.");
  console.log("Without one, both get workers.dev URLs, and only the mobile app can sign in.");
  const answer = await ask(
    "Your domain on Cloudflare (e.g. example.com), or Enter for workers.dev: ",
  );
  return answer === "" ? null : normalizeDomain(answer);
}

async function ensureDatabase(api: WorkerConfig) {
  const db = api.d1_databases?.[0];
  if (!db?.database_name) return;
  step(`Checking the D1 database "${db.database_name}"`);
  const list = await wrangler(apiDir, ["d1", "list", "--json"], { quiet: true });
  const databases = safeJson<{ name: string }[]>(list.stdout) ?? [];
  if (databases.some((d) => d.name === db.database_name)) {
    console.log("Already exists.");
    return;
  }
  await wrangler(apiDir, ["d1", "create", db.database_name, "--update-config=false"]);
}

async function collectSecrets(api: WorkerConfig): Promise<Record<string, string>> {
  const required = api.secrets?.required ?? [];
  if (required.length === 0) return {};
  step("Checking the API's secrets");
  // Fails when the Worker has never been deployed, which means it has no secrets yet.
  const list = await wrangler(apiDir, ["secret", "list", "--format", "json"], {
    quiet: true,
    allowFailure: true,
  });
  const existing = (safeJson<{ name: string }[]>(list.stdout) ?? []).map((s) => s.name);
  const missing = missingSecrets(required, existing);
  if (missing.length === 0) {
    console.log(`All set: ${required.join(", ")}.`);
    return {};
  }

  const values: Record<string, string> = {};
  for (const name of missing) {
    const fromEnv = process.env[name];
    if (fromEnv) {
      console.log(`${name}: using the value from your environment.`);
      values[name] = fromEnv;
      continue;
    }
    if (!interactive)
      throw new Error(`${name} is not set on ${api.name}. Set it in the environment.`);
    const typed = await ask(
      `${name} is not set on ${api.name}. Paste a value, or press Enter to generate a random one: `,
      { secret: true },
    );
    values[name] = typed || randomBytes(32).toString("base64");
    console.log(typed ? `${name}: using your value.` : `${name}: generated a random value.`);
  }
  return values;
}

async function deployApi(
  api: WorkerConfig,
  target: Target,
  mobileScheme: string | undefined,
  extra: string[],
) {
  const args = [
    "deploy",
    "--var",
    `BETTER_AUTH_URL:${target.apiUrl}`,
    "--var",
    `TRUSTED_ORIGINS:${trustedOrigins(target.webUrl, mobileScheme)}`,
    ...(target.apiHost ? ["--domain", target.apiHost] : []),
    ...extra,
  ];
  step(`Deploying ${api.name} to ${target.apiUrl}`);
  return wrangler(apiDir, args, { tee: true });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  const api = readJsonc<WorkerConfig>(join(apiDir, "wrangler.jsonc"));
  const web = readJsonc<WorkerConfig>(join(webDir, "wrangler.jsonc"));
  const mobile = readJsonc<{ expo?: { scheme?: string } }>(join(root, "apps/mobile/app.json"));
  const mobileScheme = mobile.expo?.scheme;
  const state = loadState();
  const dryRun = options.dryRun ? ["--dry-run"] : [];

  if (!options.dryRun) await signIn();
  const domain = await chooseDomain(options, state);
  let subdomain = state.workersSubdomain ?? (options.dryRun ? "your-subdomain" : undefined);
  const targetFor = (sub: string | undefined): Target =>
    domain ? domainTarget(domain) : workersDevTarget(sub ?? "your-subdomain", api.name, web.name);

  if (!options.dryRun) {
    await ensureDatabase(api);
    step("Applying D1 migrations");
    await wrangler(apiDir, ["d1", "migrations", "apply", "DB", "--remote"]);
  }

  const secrets = options.dryRun ? {} : await collectSecrets(api);
  const secretsDir = mkdtempSync(join(tmpdir(), "bismillah-deploy-"));
  try {
    const extra = [...dryRun];
    if (Object.keys(secrets).length > 0) {
      const file = join(secretsDir, "secrets.json");
      writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
      extra.push("--secrets-file", file);
    }
    const result = await deployApi(api, targetFor(subdomain), mobileScheme, extra);

    // On workers.dev the URL is only known after the first deploy. Learn it, then redeploy
    // once so BETTER_AUTH_URL and TRUSTED_ORIGINS point at the right place.
    if (!domain && !options.dryRun) {
      const learned = parseWorkersDevSubdomain(result.stdout, api.name);
      if (!learned) {
        throw new Error(
          `Couldn't find ${api.name}'s workers.dev URL in the output. Is workers.dev enabled for the Worker?`,
        );
      }
      if (learned !== subdomain) {
        subdomain = learned;
        await deployApi(api, targetFor(subdomain), mobileScheme, []);
      }
    }
  } finally {
    rmSync(secretsDir, { recursive: true, force: true });
  }

  const target = targetFor(subdomain);
  if (!options.dryRun) saveState({ domain, ...(subdomain ? { workersSubdomain: subdomain } : {}) });

  step(`Building ${web.name} against ${target.apiUrl}`);
  await run("pnpm", ["--filter", "@bismillah/web", "run", "build"], {
    cwd: root,
    env: { VITE_API_URL: target.apiUrl },
  });
  step(`Deploying ${web.name} to ${target.webUrl}`);
  await wrangler(webDir, [
    "deploy",
    ...(target.webHost ? ["--domain", target.webHost] : []),
    ...dryRun,
  ]);

  step(options.dryRun ? "Dry run finished: nothing was uploaded" : "Deployed");
  console.log(`  API      ${target.apiUrl}`);
  console.log(`  Web app  ${target.webUrl}`);
  console.log(
    `  Mobile   build with EXPO_PUBLIC_API_URL=${target.apiUrl} (see apps/mobile/README.md)`,
  );
  if (!domain) {
    console.log(
      "\nOn workers.dev the browser won't send the API's cookie to the web app, so web sign-in\n" +
        "needs your own domain: run `pnpm run deploy --domain example.com` when you have one.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
