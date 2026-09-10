import { env } from "cloudflare:workers";

export async function GET() {
  const { results } = await env.DB.prepare(
    "SELECT id, title, body, created_at FROM notes ORDER BY created_at DESC LIMIT 50"
  ).all();
  return Response.json({ notes: results ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const title = (body.title ?? "").trim();
  const noteBody = (body.body ?? "").trim();
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  const result = await env.DB.prepare(
    "INSERT INTO notes (title, body) VALUES (?, ?) RETURNING id, title, body, created_at"
  )
    .bind(title, noteBody)
    .first();
  return Response.json({ note: result }, { status: 201 });
}
