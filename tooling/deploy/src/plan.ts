/** Where the Workers end up, and the URLs every app needs to find each other. */
export interface Target {
  /** Public origin of the API Worker, e.g. `https://api.example.com`. */
  apiUrl: string;
  /** Public origin of the web Worker, e.g. `https://app.example.com`. */
  webUrl: string;
  /** Custom domains to attach, when deploying to your own domain. */
  apiHost?: string;
  webHost?: string;
}

export interface Options {
  dryRun: boolean;
  domain?: string;
  workersDev: boolean;
  help: boolean;
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Accepts `example.com`, `https://Example.com/` and the like; returns the bare hostname. */
export function normalizeDomain(input: string): string {
  const domain = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (!HOSTNAME.test(domain)) {
    throw new Error(`"${input}" is not a domain name. Use something like example.com.`);
  }
  return domain;
}

/**
 * The API on `api.<domain>` and the web app on `app.<domain>`. Both must share a site so the
 * browser sends the API's session cookie with the web app's requests.
 */
export function domainTarget(domain: string): Target {
  const apiHost = `api.${domain}`;
  const webHost = `app.${domain}`;
  return { apiUrl: `https://${apiHost}`, webUrl: `https://${webHost}`, apiHost, webHost };
}

/** Each Worker on its default `<name>.<subdomain>.workers.dev` URL. */
export function workersDevTarget(subdomain: string, apiName: string, webName: string): Target {
  return {
    apiUrl: `https://${apiName}.${subdomain}.workers.dev`,
    webUrl: `https://${webName}.${subdomain}.workers.dev`,
  };
}

/** The API's `TRUSTED_ORIGINS`: the web app, plus the mobile app's URL scheme when there is one. */
export function trustedOrigins(webUrl: string, mobileScheme?: string): string {
  return [webUrl, ...(mobileScheme ? [`${mobileScheme}://`] : [])].join(",");
}

/**
 * The address transactional email comes from: `EMAIL_FROM` from the environment, else
 * `noreply@<domain>`. Empty on workers.dev, which makes the API log emails instead.
 */
export function emailSender(domain: string | null, override?: string): string {
  if (override?.trim()) return override.trim();
  return domain ? `noreply@${domain}` : "";
}

/** Reads `wrangler email sending settings <domain>` output: is sending on for the domain? */
export function sendingEnabled(output: string): boolean {
  return /^\s*Enabled:\s+true\s*$/m.test(output);
}

/** Finds `https://<worker>.<subdomain>.workers.dev` in `wrangler deploy` output. */
export function parseWorkersDevSubdomain(output: string, workerName: string): string | undefined {
  const escaped = workerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`https://${escaped}\\.([a-z0-9-]+)\\.workers\\.dev`).exec(output)?.[1];
}

/** Required secret names that the deployed Worker does not have yet. */
export function missingSecrets(required: readonly string[], existing: readonly string[]): string[] {
  const have = new Set(existing);
  return required.filter((name) => !have.has(name));
}

export function parseArgs(argv: readonly string[]): Options {
  const options: Options = { dryRun: false, workersDev: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--workers-dev") options.workersDev = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--domain") {
      const value = argv[++i];
      if (!value) throw new Error("--domain needs a value, e.g. --domain example.com");
      options.domain = value;
    } else if (arg.startsWith("--domain=")) options.domain = arg.slice("--domain=".length);
    else if (arg === "--") continue;
    else throw new Error(`Unknown option "${arg}". Run with --help to see the options.`);
  }
  if (options.domain !== undefined && options.workersDev) {
    throw new Error("Pass either --domain or --workers-dev, not both.");
  }
  return options;
}
