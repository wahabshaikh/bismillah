import type { Auth, AuthSession } from "./auth.ts";
import type { Db } from "./db/index.ts";

/** Hono generics shared by every route. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Db;
    auth: Auth;
    user: AuthSession["user"] | null;
    session: AuthSession["session"] | null;
  };
};

/** Variables after `requireAuth` has run. */
export type AuthedEnv = AppEnv & {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession["session"];
  };
};
