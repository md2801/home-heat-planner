import type { Metadata } from "next";
import { AuthPage } from "@/features/account/auth-page";
export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };
export default function Page() { return <AuthPage initialMode="sign-up" />; }
