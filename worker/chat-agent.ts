import { createWorkersAI } from "workers-ai-provider";
import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  pruneMessages,
  tool,
  stepCountIs,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { z } from "zod";

/**
 * Bismillah ChatAgent — Workers AI chat with demo tools.
 * Halal-friendly: helpful, respectful, no haram guidance.
 */
export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // BYOK (P1): a user may store an encrypted provider key via
    // `/settings` → `lib/user-ai-keys.ts` `getDecryptedUserAiKey(env, userId)`.
    // It is intentionally NOT wired in here — Workers AI stays the default.
    // To use it later: resolve the signed-in user id for this DO, fetch the key,
    // and swap `model` for the matching provider's model.
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
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
    });

    return result.toUIMessageStreamResponse();
  }
}
