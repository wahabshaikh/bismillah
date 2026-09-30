# @bismillah/mobile

The mobile app: [Expo](https://expo.dev) (SDK 57, React Native) for iOS and Android, with
file-based routing from [Expo Router](https://docs.expo.dev/router/introduction/). It signs in
with the same [Better Auth](https://www.better-auth.com) backend as the web app and calls the
[API Worker](../api) through the same typed client,
[`@bismillah/api-client`](../../packages/api-client), so a breaking API change fails
`pnpm typecheck` here too.

## Local development

You need the [Expo Go](https://expo.dev/go) app on a phone, or an iOS simulator / Android
emulator. Run the API so your device can reach it, then start Metro:

```sh
# terminal 1, from the repo root: the API, listening on your local network
pnpm --filter @bismillah/api dev --ip 0.0.0.0

# terminal 2
pnpm --filter @bismillah/mobile start
```

Scan the QR code with your phone's camera (iOS) or Expo Go (Android), or press `i` / `a` for a
simulator. Create an account, then upload a file: it lands in the same D1 database and R2
bucket the web app uses.

**Which API does the app call?** When `EXPO_PUBLIC_API_URL` is unset, port 8787 on the machine
running Metro, at the address your device already uses to reach Metro. That is why the API
listens on `0.0.0.0` above. To use another API (a deployed one, or when running Metro with
`--tunnel`), copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL`.

## How it fits together

| Piece             | Where                        | Notes                                                        |
| ----------------- | ---------------------------- | ------------------------------------------------------------ |
| Routes            | `src/app/`                   | File-based; `_layout.tsx` shows signed-in or signed-out screens |
| API client        | `src/lib/api.ts`             | The web app's typed client, plus native upload and download  |
| Auth client       | `src/lib/auth.ts`            | Better Auth with its Expo plugin; session in secure storage  |
| Server state      | `src/lib/queries.ts`         | TanStack Query, as on the web                                |
| Components        | `src/components/`            | Native versions of `@bismillah/ui`, on the same design tokens (`src/theme.ts`) |
| App config        | `app.json`                   | Name, URL scheme, bundle IDs, config plugins                 |

**Sessions without a cookie jar.** The API keeps sessions in a cookie. Better Auth's
[Expo plugin](https://www.better-auth.com/docs/integrations/expo) stores that cookie in the
Keychain (iOS) or Keystore (Android) and sends it as a `Cookie` header, with the app's URL
scheme (`bismillah://`) as its origin. That's why the API lists `bismillah://` in
`TRUSTED_ORIGINS`, along with `exp://` for Expo Go during development.

**Uploads stream from disk.** Picking a file hands its path to the OS, which sends it as the
raw request body; the API pipes it straight into R2. The app never loads the file into memory,
and shows upload progress as it goes.

**Protected screens.** The root layout wraps screens in `Stack.Protected`: signed-out users only
see sign-in and sign-up, and signing in or out switches screens automatically, with no redirects
to maintain.

## Commands

| Command                   | What it does                                                 |
| ------------------------- | ------------------------------------------------------------ |
| `pnpm start`              | Starts Metro (`expo start`)                                  |
| `pnpm ios` / `pnpm android` | Starts Metro and opens a simulator or emulator             |
| `pnpm build`              | Bundles the JavaScript for iOS and Android into `dist/` (CI runs this) |
| `pnpm typecheck`          | Type-checks the app, including every API call                |
| `pnpm test`               | Unit tests with Vitest                                       |

## Shipping to the stores

Native projects aren't committed: `npx expo prebuild` generates `ios/` and `android/` from
`app.json` whenever you need them
([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)).
Before your first release:

1. Change `name`, `slug`, `scheme`, `ios.bundleIdentifier` and `android.package` in `app.json`.
   If you change `scheme`, update it in `src/lib/auth.ts` and in the API's `TRUSTED_ORIGINS`.
2. Point the build at your production API by setting `EXPO_PUBLIC_API_URL`.
3. Remove `exp://` from the API's production `TRUSTED_ORIGINS`.
4. Build and submit with [EAS](https://docs.expo.dev/build/introduction/) (`npx eas-cli build`),
   or locally with `npx expo run:ios --configuration Release` / `npx expo run:android --variant release`.

The app adds nothing to your Cloudflare bill beyond the API requests it makes: it is served by
the app stores, not by a Worker.

## React versions

React Native pins the exact React version its renderer was built against, so this app uses
React 19.2.3 (what Expo SDK 57 ships) rather than the workspace catalog's version. pnpm keeps the
two apart; upgrade them together with `npx expo install --fix` when you move to a new SDK.
