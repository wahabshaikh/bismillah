import { type ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, Card, ErrorMessage, Field, Muted, Title } from "./ui.tsx";

export interface AuthFields {
  name: string;
  email: string;
  password: string;
}

interface AuthFormProps {
  title: string;
  description: string;
  submitLabel: string;
  withName?: boolean;
  footer: ReactNode;
  /** Resolves with an error message to show, or nothing on success. */
  onSubmit: (fields: AuthFields) => Promise<string | undefined>;
}

/** The sign-in and sign-up form, mirroring the web app's `AuthForm`. */
export function AuthForm({
  title,
  description,
  submitLabel,
  withName = false,
  footer,
  onSubmit,
}: AuthFormProps) {
  const [fields, setFields] = useState<AuthFields>({ name: "", email: "", password: "" });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const set = (key: keyof AuthFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  async function submit() {
    setPending(true);
    setError(undefined);
    try {
      setError(await onSubmit({ ...fields, email: fields.email.trim() }));
    } catch {
      setError("Could not reach the API. Is it running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card>
          <Title>{title}</Title>
          <Muted>{description}</Muted>
          {withName && (
            <Field
              label="Name"
              value={fields.name}
              onChangeText={set("name")}
              autoComplete="name"
              textContentType="name"
            />
          )}
          <Field
            label="Email"
            value={fields.email}
            onChangeText={set("email")}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={fields.password}
            onChangeText={set("password")}
            secureTextEntry
            autoComplete={withName ? "new-password" : "current-password"}
            textContentType={withName ? "newPassword" : "password"}
            onSubmitEditing={submit}
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button onPress={submit} loading={pending}>
            {submitLabel}
          </Button>
          {footer}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 16 },
});
