import { type ApiError, unwrap } from "@bismillah/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Organization } from "../components/organization.tsx";
import { Plan } from "../components/plan.tsx";
import { Button, ErrorMessage, Muted, Title } from "../components/ui.tsx";
import { api, downloadUpload, type Upload, uploadFile } from "../lib/api.ts";
import { authClient } from "../lib/auth.ts";
import { formatBytes } from "../lib/format.ts";
import { billingQuery, uploadsQuery } from "../lib/queries.ts";
import { useColors } from "../theme.ts";

export default function Files() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const colors = useColors();
  const uploads = useQuery(uploadsQuery);
  const [progress, setProgress] = useState<number>();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: uploadsQuery.queryKey });

  const upload = useMutation<Upload | undefined, ApiError>({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      const file = picked.assets?.[0];
      if (picked.canceled || !file) return undefined;
      setProgress(0);
      return uploadFile(file, setProgress);
    },
    onSettled: () => {
      setProgress(undefined);
      return invalidate();
    },
  });

  const remove = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => unwrap(api.uploads[":id"].$delete({ param: { id } })),
    onSettled: invalidate,
  });

  const download = useMutation<void, Error, Upload>({
    mutationFn: async (item) => {
      const file = await downloadUpload(item.id);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: item.contentType,
          dialogTitle: item.filename,
        });
      }
    },
  });

  function confirmDelete(item: Upload) {
    Alert.alert("Delete file?", item.filename, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(item.id) },
    ]);
  }

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  const error = upload.error ?? remove.error ?? download.error ?? uploads.error;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button variant="ghost" onPress={signOut}>
              Sign out
            </Button>
          ),
        }}
      />
      <FlatList
        data={uploads.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={uploads.isRefetching}
            onRefresh={() =>
              Promise.all([
                uploads.refetch(),
                queryClient.invalidateQueries({ queryKey: billingQuery.queryKey }),
              ])
            }
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greeting}>
              <Title>Hi, {session?.user.name}</Title>
              <Muted>Signed in as {session?.user.email}</Muted>
            </View>
            <Organization />
            <Plan />
            <Button
              onPress={() => upload.mutate()}
              loading={upload.isPending && progress === undefined}
            >
              {progress === undefined
                ? "Upload a file"
                : `Uploading… ${Math.round(progress * 100)}%`}
            </Button>
            {error && <ErrorMessage>{error.message}</ErrorMessage>}
          </View>
        }
        ListEmptyComponent={uploads.isPending ? null : <Muted>No files yet.</Muted>}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowText}
              accessibilityRole="button"
              accessibilityHint="Downloads and shares the file"
              disabled={download.isPending}
              onPress={() => download.mutate(item)}
            >
              <Text numberOfLines={1} style={[styles.filename, { color: colors.foreground }]}>
                {item.filename}
              </Text>
              <Muted>
                {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleString()}
              </Muted>
            </Pressable>
            <Button
              variant="danger"
              disabled={remove.isPending && remove.variables === item.id}
              onPress={() => confirmDelete(item)}
            >
              Delete
            </Button>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  header: { gap: 16, marginBottom: 16 },
  greeting: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowText: { flex: 1, gap: 2 },
  filename: { fontSize: 15, fontWeight: "500" },
  separator: { height: StyleSheet.hairlineWidth },
});
