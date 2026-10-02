import { NativeSelect, NativeSelectOption } from "@bismillah/ui/components/native-select";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useState } from "react";
import { authClient, useActiveOrganization, useListOrganizations } from "../lib/auth.ts";

const CREATE = "__create__";

/**
 * Picks the session's active organization. Org-scoped API routes read it from the session,
 * so every cached query is refetched after a switch.
 */
export function OrganizationSwitcher() {
  const { data: organizations } = useListOrganizations();
  const { data: active } = useActiveOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const organizationId = event.target.value;
    if (organizationId === CREATE) {
      await navigate({ to: "/organization", hash: "create" });
      return;
    }
    setPending(true);
    await authClient.organization.setActive({ organizationId });
    await queryClient.invalidateQueries();
    setPending(false);
  }

  if (!organizations) return null;

  return (
    <NativeSelect
      aria-label="Organization"
      className="max-w-48"
      value={active?.id ?? ""}
      disabled={pending}
      onChange={onChange}
    >
      {!active && <NativeSelectOption value="">No organization</NativeSelectOption>}
      {organizations.map((org) => (
        <NativeSelectOption key={org.id} value={org.id}>
          {org.name}
        </NativeSelectOption>
      ))}
      <NativeSelectOption value={CREATE}>+ New organization</NativeSelectOption>
    </NativeSelect>
  );
}
