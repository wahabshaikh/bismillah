import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from "react-native";
import { radius, useColors } from "../theme.ts";

/** Native counterparts of the web's `@bismillah/ui` components, on the same tokens. */

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const palette = {
    primary: { background: colors.primary, text: colors.primaryForeground },
    secondary: { background: colors.muted, text: colors.foreground },
    ghost: { background: "transparent", text: colors.foreground },
    danger: { background: "transparent", text: colors.danger },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.button,
        { backgroundColor: palette.background, opacity: inactive ? 0.5 : state.pressed ? 0.8 : 1 },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.buttonText, { color: palette.text }]}>{children}</Text>
      )}
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...props }: FieldProps) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.foreground,
            backgroundColor: colors.background,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function Card({ style, ...props }: ViewProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.background },
        style,
      ]}
      {...props}
    />
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View accessibilityRole="alert" style={[styles.alert, { borderColor: colors.danger }]}>
      <Text style={{ color: colors.danger }}>{children}</Text>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.muted, { color: colors.mutedForeground }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 15, fontWeight: "600" },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500" },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    fontSize: 16,
  },
  card: {
    padding: 20,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  alert: { padding: 12, borderWidth: 1, borderRadius: radius.md },
  title: { fontSize: 22, fontWeight: "600" },
  muted: { fontSize: 14 },
});
