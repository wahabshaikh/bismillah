import { type ApiError, type SubscriptionJson, unwrap } from "@bismillah/api-client";
import { Alert, AlertDescription } from "@bismillah/ui/components/alert";
import { Button, buttonVariants } from "@bismillah/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@bismillah/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, useRef } from "react";
import { api } from "../../lib/api.ts";
import { type Activity, useLiveUploads } from "../../lib/live.ts";
import { billingQuery, uploadsQuery } from "../../lib/queries.ts";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · bismillah" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(uploadsQuery),
      context.queryClient.ensureQueryData(billingQuery),
    ]),
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
      <Plan />
      <Uploads />
    </div>
  );
}

function Plan() {
  const { data } = useQuery(billingQuery);

  const checkout = useMutation<void, ApiError>({
    mutationFn: async () => {
      const returnUrl = new URL("/dashboard", window.location.origin).toString();
      const { url } = await unwrap(api.billing.checkout.$post({ json: { returnUrl } }));
      window.location.assign(url);
    },
  });

  if (!data?.enabled && !data?.subscription) return null;
  const subscription = data.subscription;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.active ? "Pro plan" : "Free plan"}</CardTitle>
        <CardDescription>{describePlan(subscription)}</CardDescription>
        <CardAction>
          {data.active ? (
            subscription?.manageUrl && (
              <a
                href={subscription.manageUrl}
                className={buttonVariants({ variant: "outline" })}
                target="_blank"
                rel="noreferrer"
              >
                Manage billing
              </a>
            )
          ) : (
            <Button onClick={() => checkout.mutate()} disabled={checkout.isPending}>
              {checkout.isPending ? "Opening checkout…" : "Upgrade"}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {checkout.error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{checkout.error.message}</AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}

function describePlan(subscription: SubscriptionJson | null | undefined): string {
  if (!subscription) return "Payments by Whop. Your plan updates here as soon as you pay.";
  const end = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;
  if (!subscription.active) return `Your subscription is ${subscription.status.replace("_", " ")}.`;
  if (subscription.status === "past_due") return "Your last payment failed. Update your card.";
  if (subscription.cancelAtPeriodEnd || subscription.status === "canceling") {
    return end ? `Cancels on ${end}.` : "Cancels at the end of this period.";
  }
  return end ? `Renews on ${end}.` : "Thanks for your support.";
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
      <Card>
        <CardHeader>
          <CardTitle>Your files</CardTitle>
          <CardDescription>
            Stored in R2, with metadata in D1. A queued job checksums each file.
          </CardDescription>
          <CardAction>
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
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

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
                      className={buttonVariants({ variant: "outline", size: "sm" })}
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
        </CardContent>
      </Card>
      <LiveActivity {...live} />
    </>
  );
}

const STATUS_LABEL = { connecting: "Connecting…", open: "Live", closed: "Reconnecting…" };

function LiveActivity({ status, activity }: ReturnType<typeof useLiveUploads>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live activity</CardTitle>
        <CardDescription>
          Pushed over a WebSocket by a Durable Object. Open this page in two tabs to see it.
        </CardDescription>
        <CardAction>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${status === "open" ? "bg-green-500" : "bg-amber-500"}`}
            />
            {STATUS_LABEL[status]}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
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
      </CardContent>
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
    case "billing.updated":
      return `Plan ${event.subscription.active ? "activated" : event.subscription.status}`;
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
