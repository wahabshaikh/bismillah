import { Alert, Button, Card, CardDescription, CardTitle, Input, Label } from "@bismillah/ui";
import { type FormEvent, type ReactNode, useId, useState } from "react";

export interface AuthFields {
  name: string;
  email: string;
  password: string;
}

export type AuthField = keyof AuthFields;

interface AuthFormProps {
  title: string;
  description: string;
  submitLabel: string;
  /** Which inputs to show, in this order. */
  fields?: AuthField[];
  /** Asks the password manager for a new password rather than a saved one. */
  newPassword?: boolean;
  footer?: ReactNode;
  /** Resolves with an error message to show, or nothing on success. */
  onSubmit: (fields: AuthFields) => Promise<string | undefined>;
}

export function AuthForm({
  title,
  description,
  submitLabel,
  fields = ["email", "password"],
  newPassword = false,
  footer,
  onSubmit,
}: AuthFormProps) {
  const id = useId();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      setError(
        await onSubmit({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      );
    } catch {
      setError("Could not reach the API. Is it running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {fields.includes("name") && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input id={`${id}-name`} name="name" autoComplete="name" required />
          </div>
        )}
        {fields.includes("email") && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
          </div>
        )}
        {fields.includes("password") && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-password`}>{newPassword ? "New password" : "Password"}</Label>
            <Input
              id={`${id}-password`}
              name="password"
              type="password"
              autoComplete={newPassword ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait…" : submitLabel}
        </Button>
        {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
      </form>
    </Card>
  );
}
