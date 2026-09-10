import { createWorkersAI } from "workers-ai-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { AIChatAgent } from "@cloudflare/ai-chat";
import { getCurrentAgent, type Connection, type ConnectionContext } from "agents";
import {
  streamText,
  generateText,
  convertToModelMessages,
  pruneMessages,
  tool,
  stepCountIs,
  type LanguageModel,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { createAuth } from "../lib/auth";
import { getDecryptedUserAiKey } from "../lib/user-ai-keys";

/** Cheap, stable defaults for BYOK providers. Override intentionally. */
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";

type ConnState = { userId?: string | null };

/**
 * Bismillah ChatAgent — Workers AI chat with demo tools.
 * Halal-friendly: helpful, respectful, no haram guidance.
 *
 * BYOK (P1b): if the connecting user is signed in *and* has stored an encrypted
 * provider key via `/settings` (`user_ai_keys`), that provider is preferred for
 * their chat. Everyone else — anonymous visitors, users with no key, or a key
 * that fails to decrypt / fails at the provider — falls back to Workers AI so
 * the template always works out of the box. The key is never logged (plaintext
 * or ciphertext); only the provider name appears in logs.
 */
export class ChatAgent extends AIChatAgent<Env> {
  /** Fast-path cache of the resolved user id; connection state is the source of truth. */
  private userId: string | null = null;

  async onConnect(connection: Connection<ConnState>, ctx: ConnectionContext) {
    await super.onConnect?.(connection, ctx);
    let userId: string | null = null;
    try {
      const auth = createAuth(this.env);
      const session = await auth.api.getSession({ headers: ctx.request.headers });
      userId = session?.user?.id ?? null;
    } catch {
      // Auth unavailable / no cookie → anonymous chat (Workers AI).
      userId = null;
    }
    this.userId = userId;
    connection.setState({ ...(connection.state ?? {}), userId });
  }

  private currentUserId(): string | null {
    if (this.userId) return this.userId;
    const { connection } = getCurrentAgent();
    const state = connection?.state as ConnState | null | undefined;
    return state?.userId ?? null;
  }

  /**
   * Resolve the chat model. Prefers a signed-in user's stored BYOK provider,
   * otherwise Workers AI. Never logs key material.
   */
  private async resolveModel(): Promise<LanguageModel> {
    const workersAiModel = () =>
      createWorkersAI({ binding: this.env.AI })(WORKERS_AI_MODEL);

    const userId = this.currentUserId();
    if (!userId) return workersAiModel();

    let stored: { provider: string; key: string } | null = null;
    try {
      stored = await getDecryptedUserAiKey(this.env, userId);
    } catch {
      stored = null;
    }
    if (!stored || stored.provider === "workers_ai") return workersAiModel();

    let byokModel: LanguageModel | null = null;
    try {
      if (stored.provider === "openai") {
        byokModel = createOpenAI({ apiKey: stored.key })(OPENAI_MODEL);
      } else if (stored.provider === "anthropic") {
        byokModel = createAnthropic({ apiKey: stored.key })(ANTHROPIC_MODEL);
      }
    } catch {
      byokModel = null;
    }
    if (!byokModel) return workersAiModel();

    // Pre-flight: a bad/expired BYOK key should degrade to Workers AI rather
    // than error the user's chat. One-token probe; never logs key material.
    try {
      await generateText({ model: byokModel, prompt: "ping", maxOutputTokens: 1 });
      return byokModel;
    } catch {
      // Intentionally does NOT log the error body — some providers echo a
      // partially-masked key in 401 messages. Provider name only.
      console.warn(
        `[chat-agent] BYOK provider "${stored.provider}" unavailable — using Workers AI`
      );
      return workersAiModel();
    }
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    const model = await this.resolveModel();

    const result = streamText({
      model,
      system: `You are Bismillah Assistant — a helpful AI that starts every build in the Name of Allah.
Be concise, respectful, and halal-friendly. Refuse requests for haram content or illegal activity.
You can check demo weather, run calculations, and read the user's timezone.`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
      }),
      tools: {
        getWeather: tool({
          description: "Get the current weather for a city (demo data)",
          inputSchema: z.object({
            city: z.string().describe("City name"),
          }),
          execute: async ({ city }) => {
            const conditions = ["sunny", "cloudy", "rainy", "snowy"];
            const temp = Math.floor(Math.random() * 30) + 5;
            return {
              city,
              temperature: temp,
              condition:
                conditions[Math.floor(Math.random() * conditions.length)],
              unit: "celsius",
            };
          },
        }),

        getUserTimezone: tool({
          description:
            "Get the user's timezone from their browser. Use when you need local time.",
          inputSchema: z.object({}),
        }),

        calculate: tool({
          description: "Perform a math calculation with two numbers",
          inputSchema: z.object({
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
            operator: z
              .enum(["+", "-", "*", "/", "%"])
              .describe("Arithmetic operator"),
          }),
          execute: async ({ a, b, operator }) => {
            const ops: Record<string, (x: number, y: number) => number> = {
              "+": (x, y) => x + y,
              "-": (x, y) => x - y,
              "*": (x, y) => x * y,
              "/": (x, y) => x / y,
              "%": (x, y) => x % y,
            };
            if (operator === "/" && b === 0) {
              return { error: "Division by zero" };
            }
            return {
              expression: `${a} ${operator} ${b}`,
              result: ops[operator](a, b),
            };
          },
        }),
      },
      onFinish,
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal,
      onError: () => {
        // A provider call failed mid-stream (quota, transient network, etc).
        // Logged without the error body so a BYOK key can never leak.
        console.warn("[chat-agent] model stream error");
      },
    });

    return result.toUIMessageStreamResponse();
  }
}
