import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (key) {
    const object = await env.ARTIFACTS.get(key);
    if (!object) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=60");
    return new Response(object.body, { headers });
  }

  const listed = await env.ARTIFACTS.list({ limit: 50 });
  return Response.json({
    objects: listed.objects.map((o) => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded,
    })),
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await env.ARTIFACTS.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });
  return Response.json({ key, size: file.size }, { status: 201 });
}
