import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { authClient } from "../lib/auth.ts";
import { Button, Card, ErrorMessage, Muted, Title } from "./ui.tsx";

/**
 * The active organization, with a picker to switch. Org-scoped API routes read it from the
 * session, so every cached query is refetched after a switch. Creating organizations and
 * inviting people happens in the web app.
 */
export function Organization() {
  const queryClient = useQueryClient();
  const organizations = authClient.useListOrganizations();
  const { data: active } = authClient.useActiveOrganization();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function setActive(organizationId: string) {
    setPending(true);
    setError(undefined);
    const result = await authClient.organization.setActive({ organizationId });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not switch organization");
      return;
    }
    await queryClient.invalidateQueries();
  }

  function pick() {
    Alert.alert("Switch organization", undefined, [
      ...(organizations.data ?? []).map((org) => ({
        text: org.id === active?.id ? `${org.name} ✓` : org.name,
        onPress: () => setActive(org.id),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  const count = organizations.data?.length ?? 0;
  if (count === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Title>{active?.name ?? "No organization"}</Title>
        <Muted>
          {active
            ? `${active.members.length} ${active.members.length === 1 ? "member" : "members"}`
            : "Pick one to work in"}
        </Muted>
      </View>
      {count > 1 || !active ? (
        <Button variant="secondary" onPress={pick} loading={pending}>
          Switch
        </Button>
      ) : null}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  text: { gap: 4 },
});
