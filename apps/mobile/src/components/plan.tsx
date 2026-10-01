import { type ApiError, unwrap } from "@bismillah/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, View } from "react-native";
import { api } from "../lib/api.ts";
import { billingQuery } from "../lib/queries.ts";
import { Button, Card, ErrorMessage, Muted, Title } from "./ui.tsx";

/**
 * The user's plan, from `GET /v1/billing`. Upgrading opens Whop's checkout in an in-app
 * browser that closes itself when Whop redirects back to the app's URL scheme; the webhook
 * has usually landed by then, and pull-to-refresh covers the rest.
 *
 * Selling digital goods through an external checkout is restricted by the App Store and
 * Google Play in many countries. Check their rules before shipping this button.
 */
export function Plan() {
  const billing = useQuery(billingQuery);

  const checkout = useMutation<void, ApiError>({
    mutationFn: async () => {
      const returnUrl = Linking.createURL("/");
      const { url } = await unwrap(api.billing.checkout.$post({ json: { returnUrl } }));
      await WebBrowser.openAuthSessionAsync(url, returnUrl);
      await billing.refetch();
    },
  });

  const data = billing.data;
  if (!data?.enabled && !data?.subscription) return null;
  const subscription = data.subscription;
  const end = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Title>{data.active ? "Pro plan" : "Free plan"}</Title>
        <Muted>
          {data.active
            ? subscription?.cancelAtPeriodEnd
              ? `Cancels on ${end ?? "the end of this period"}`
              : end
                ? `Renews on ${end}`
                : "Thanks for your support"
            : "Payments by Whop"}
        </Muted>
      </View>
      {data.active ? (
        subscription?.manageUrl ? (
          <Button
            variant="secondary"
            onPress={() => WebBrowser.openBrowserAsync(subscription.manageUrl as string)}
          >
            Manage billing
          </Button>
        ) : null
      ) : (
        <Button onPress={() => checkout.mutate()} loading={checkout.isPending}>
          Upgrade
        </Button>
      )}
      {checkout.error && <ErrorMessage>{checkout.error.message}</ErrorMessage>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  text: { gap: 4 },
});
