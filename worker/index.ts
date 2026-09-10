/**
 * Custom Cloudflare Worker entry for Bismillah.
 * Routes /agents/* to the ChatAgent Durable Object, then delegates to vinext.
 * Also runs the daily digest Cron Trigger (see wrangler.jsonc `triggers.crons`).
 */
import handler from "vinext/server/fetch-handler";
import { routeAgentRequest } from "agents";
import { runDailyDigest } from "../lib/jobs/digest";
import { captureException } from "../lib/monitoring";

export { ChatAgent } from "./chat-agent";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    return handler.fetch(request, env, ctx);
  },

  /**
   * Cron Trigger. `0 9 * * *` → 09:00 UTC daily. Extend `runDailyDigest` /
   * add more cron expressions in wrangler.jsonc and branch on
   * `controller.cron` here.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("[scheduled] cron fired", controller.cron);
    ctx.waitUntil(
      runDailyDigest(env).catch((err) =>
        captureException(env, err, { job: "runDailyDigest", cron: controller.cron })
      )
    );
  },
};
