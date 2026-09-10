"use client";

import dynamic from "next/dynamic";

const ForgotPasswordForm = dynamic(() => import("./ForgotPasswordForm"), {
  ssr: false,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
