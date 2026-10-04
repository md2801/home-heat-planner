import type { Metadata } from "next";
import { AuthPage } from "@/features/account/auth-page";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const query = await searchParams; return <AuthPage ssoError={!!query.error} />; }
