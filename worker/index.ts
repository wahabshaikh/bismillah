/**
 * Custom Cloudflare Worker entry for Bismillah.
 * Routes /agents/* to the ChatAgent Durable Object, then delegates to vinext.
 */
import handler from "vinext/server/fetch-handler";
import { routeAgentRequest } from "agents";

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
};
