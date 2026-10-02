import { expoClient } from "@better-auth/expo/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config.ts";

/**
 * Better Auth runs inside the API Worker. Native apps have no cookie jar to share with it, so
 * the Expo plugin keeps the session cookie in the device's secure storage (Keychain on iOS,
 * Keystore on Android) and adds it to every auth request. The API must list the app's scheme
 * (`bismillah://`, from app.json) in `TRUSTED_ORIGINS`.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/api/auth",
  plugins: [
    expoClient({
      scheme: "bismillah",
      storagePrefix: "bismillah",
      storage: SecureStore,
    }),
    // Organizations are created and managed on the web; the app switches between them.
    organizationClient({ teams: { enabled: true } }),
  ],
});

/** Headers that carry the session to the API's `/v1` routes. */
export async function sessionHeaders(): Promise<Record<string, string>> {
  const cookie = await authClient.getCookie();
  return cookie ? { cookie } : {};
}
