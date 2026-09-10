import { redirect } from "next/navigation";

/** `/account` is kept as a stable alias — the real page is `/dashboard`. */
export default function AccountPage() {
  redirect("/dashboard");
}
