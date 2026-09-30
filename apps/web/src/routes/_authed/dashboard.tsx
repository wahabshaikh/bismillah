import { type ApiError, unwrap } from "@bismillah/api-client";
import { Alert, Button, buttonClassName, Card, CardDescription, CardTitle } from "@bismillah/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, useRef } from "react";
import { api } from "../../lib/api.ts";
import { type Activity, useLiveUploads } from "../../lib/live.ts";
import { uploadsQuery } from "../../lib/queries.ts";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · bismillah" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(uploadsQuery),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.name}</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </div>
      <Uploads />
    </div>
  );
}

function Uploads() {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const { data } = useQuery(uploadsQuery);
  const live = useLiveUploads();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: uploadsQuery.queryKey });

  const upload = useMutation<unknown, ApiError, File>({
    // The file streams to R2 as the raw request body; see apps/api/src/routes/uploads.ts.
    mutationFn: (file) =>
      unwrap(
        api.uploads.$post(
          { query: { filename: file.name } },
          {
            headers: { "content-type": file.type || "application/octet-stream" },
            init: { body: file },
          },
        ),
      ),
    onSettled: invalidate,
  });

  const remove = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => unwrap(api.uploads[":id"].$delete({ param: { id } })),
    onSettled: invalidate,
  });

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) upload.mutate(file);
    event.target.value = "";
  }

  const error = upload.error ?? remove.error;

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Your files</CardTitle>
            <CardDescription>
              Stored in R2, with metadata in D1. A queued job checksums each file.
            </CardDescription>
          </div>
          <input
            ref={input}
            type="file"
            className="sr-only"
            onChange={onFileChange}
            tabIndex={-1}
          />
          <Button onClick={() => input.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>

        {error && <Alert>{error.message}</Alert>}

        {data?.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data?.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleString()} ·{" "}
                    {item.status === "ready" && item.sha256 ? (
                      <span title={`SHA-256 ${item.sha256}`}>
                        SHA-256 {item.sha256.slice(0, 12)}…
                      </span>
                    ) : (
                      <span className="animate-pulse">Processing…</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={api.uploads[":id"].content.$url({ param: { id: item.id } }).toString()}
                    className={buttonClassName({ variant: "secondary", size: "sm" })}
                  >
                    Download
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending && remove.variables === item.id}
                    onClick={() => remove.mutate(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <LiveActivity {...live} />
    </>
  );
}

const STATUS_LABEL = { connecting: "Connecting…", open: "Live", closed: "Reconnecting…" };

function LiveActivity({ status, activity }: ReturnType<typeof useLiveUploads>) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Live activity</CardTitle>
          <CardDescription>
            Pushed over a WebSocket by a Durable Object. Open this page in two tabs to see it.
          </CardDescription>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`size-2 rounded-full ${status === "open" ? "bg-green-500" : "bg-amber-500"}`}
          />
          {STATUS_LABEL[status]}
        </span>
      </div>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Upload a file.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {activity.map((item) => (
            <li key={item.key} className="flex justify-between gap-4">
              <span className="truncate">{describe(item)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.at.toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function describe({ event }: Activity): string {
  switch (event.type) {
    case "upload.created":
      return `Uploaded ${event.upload.filename}`;
    case "upload.processed":
      return `Processed ${event.upload.filename}`;
    case "upload.deleted":
      return "Deleted a file";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
