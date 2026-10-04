import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordPage } from "@/features/account/reset-password-page";
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <Suspense fallback={<p role="status">Opening password reset…</p>}><ResetPasswordPage /></Suspense>; }
