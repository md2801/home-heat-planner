import Link from "next/link";
import type { ReactNode } from "react";

export function ButtonLink({ href, children, secondary = false }: {
  href: string; children: ReactNode; secondary?: boolean;
}) {
  return <Link href={href} className={`inline-flex min-h-12 items-center justify-center rounded-control border px-6 py-3 text-base font-semibold transition-colors ${secondary ? "border-line bg-surface text-forest hover:bg-eucalyptus" : "border-forest bg-forest text-white hover:bg-forest-dark"}`}>{children}</Link>;
}
