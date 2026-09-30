import app from "./app.ts";
import { handleJobs, type Job } from "./jobs/index.ts";
import { runScheduled } from "./jobs/scheduled.ts";

export { UserEvents } from "./realtime/user-events.ts";

export default {
  fetch: app.fetch,
  queue: handleJobs,
  scheduled: async (_controller, env) => {
    await runScheduled(env);
  },
} satisfies ExportedHandler<Env, Job>;
