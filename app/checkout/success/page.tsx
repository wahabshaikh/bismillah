import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Thank you — Bismillah",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Alhamdulillah — payment received</CardTitle>
            <CardDescription>
              JazakAllahu khayran for your support. Your receipt is on its way by
              email.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-slate-700">
            <p>
              Your order is being confirmed via a Polar webhook and recorded in
              D1. You can now head back and keep building.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/account"
                className="font-medium text-emerald-700 hover:underline"
              >
                Go to your account →
              </Link>
              <Link
                href="/"
                className="font-medium text-emerald-700 hover:underline"
              >
                Back home →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
