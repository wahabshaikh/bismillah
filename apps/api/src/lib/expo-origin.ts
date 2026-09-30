import type { BetterAuthPlugin } from "better-auth";

/**
 * Native apps send no `Origin` header, so Better Auth's CSRF check would reject every
 * cookie-carrying request from the mobile app (sign-out, for one). Better Auth's Expo
 * client sends the app's URL scheme as `expo-origin` instead (e.g. `bismillah://`); this
 * copies it into `Origin`, where it is checked against `TRUSTED_ORIGINS` like any other.
 *
 * It is the part of `@better-auth/expo`'s server plugin that email and password sign-in
 * needs. Swap in that plugin when you add social sign-in to the mobile app, since it also
 * hands the OAuth callback back to the app. It isn't used here because its optional peer
 * dependencies pull Expo and React Native into this Worker's dependency tree.
 */
export const expoOrigin = () =>
  ({
    id: "expo-origin",
    async onRequest(request) {
      const origin = request.headers.get("expo-origin");
      if (!origin || request.headers.has("origin")) return;
      const headers = new Headers(request.headers);
      headers.set("origin", origin);
      return { request: new Request(request, { headers }) };
    },
  }) satisfies BetterAuthPlugin;
