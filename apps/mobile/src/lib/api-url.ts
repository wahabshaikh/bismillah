/** Port `wrangler dev` serves the API on. */
const API_DEV_PORT = 8787;

/**
 * Picks the API origin: `EXPO_PUBLIC_API_URL` when it is set, otherwise the API's dev port on
 * the machine running the Expo dev server. A phone or emulator already reaches that machine
 * at the address Metro reports, so the API only has to listen there too.
 *
 * @param configured `EXPO_PUBLIC_API_URL`, inlined at build time.
 * @param devServerHost The dev server's `host:port`, from `Constants.expoConfig.hostUri`.
 */
export function resolveApiUrl(configured?: string, devServerHost?: string): string {
  if (configured) return configured.replace(/\/+$/, "");
  const host = devServerHost?.replace(/:\d+$/, "") || "localhost";
  return `http://${host}:${API_DEV_PORT}`;
}
