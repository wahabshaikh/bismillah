import { Alert, AlertDescription } from "@bismillah/ui/components/alert";
import { Button } from "@bismillah/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@bismillah/ui/components/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, useListOrganizations } from "../../../lib/auth.ts";

/**
 * Where invitation emails link to. Signed-out visitors are sent to sign in (or sign up with
 * the invited address) by the `_authed` layout and come back here afterwards.
 */
export const Route = createFileRoute("/_authed/accept-invitation/$id")({
  head: () => ({ meta: [{ title: "Invitation · bismillah" }] }),
  component: AcceptInvitation,
});

function AcceptInvitation() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetch } = useListOrganizations();
  const [pending, setPending] = useState<"accept" | "reject">();
  const [error, setError] = useState<string>();

  const invitation = useQuery({
    queryKey: ["invitation", id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({ query: { id } });
      if (error) throw new Error(error.message || "This invitation is no longer valid");
      return data;
    },
    retry: false,
  });

  async function respond(action: "accept" | "reject") {
    setPending(action);
    setError(undefined);
    const { error } =
      action === "accept"
        ? await authClient.organization.acceptInvitation({ invitationId: id })
        : await authClient.organization.rejectInvitation({ invitationId: id });
    setPending(undefined);
    if (error) {
      setError(error.message || "Something went wrong");
      return;
    }
    await refetch();
    await queryClient.invalidateQueries();
    await navigate({ to: action === "accept" ? "/organization" : "/dashboard" });
  }

  if (invitation.isPending) return null;

  if (invitation.error || !invitation.data) {
    return (
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invitation not found</CardTitle>
          <CardDescription>
            It may have expired or been cancelled, or it was sent to an address other than{" "}
            {user.email}. Ask for a new one, or{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              go to your dashboard
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { organizationName, inviterEmail, role } = invitation.data;

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join {organizationName}</CardTitle>
        <CardDescription>
          {inviterEmail} invited you to join as {role === "admin" ? "an admin" : `a ${role}`}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button onClick={() => respond("accept")} disabled={pending !== undefined}>
            {pending === "accept" ? "Joining…" : "Accept"}
          </Button>
          <Button
            variant="outline"
            onClick={() => respond("reject")}
            disabled={pending !== undefined}
          >
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
