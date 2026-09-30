/** Search params for pages that send the user back where they came from. */
export function redirectSearch(search: Record<string, unknown>): { redirect?: string } {
  return typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {};
}

/** Only same-app paths, so a crafted link can't bounce users to another site. */
export function safeRedirect(redirect: string | undefined): string {
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
}
