import { invariant } from "@bismillah/core";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      invariant(env.APP_NAME, "APP_NAME is not configured");
      return Response.json({ ok: true, app: env.APP_NAME });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
