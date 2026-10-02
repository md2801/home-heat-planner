import { ButtonLink } from "@/components/ui/button-link";
import { journeyRoutes, type JourneyPath } from "@/features/journey/routes";

export function ScreenPlaceholder({ path }: { path: JourneyPath }) {
  const index = journeyRoutes.findIndex((route) => route.href === path);
  const route = journeyRoutes[index];
  if (!route) return null;
  const previous = journeyRoutes[index - 1];
  const next = journeyRoutes[index + 1];

  return <section aria-labelledby="screen-title" className="max-w-3xl">
    <p className="mb-5 text-sm font-medium text-forest">Foundation preview · Screen placeholder</p>
    <h1 id="screen-title" className="text-4xl leading-tight font-bold tracking-tight sm:text-6xl">{route.title}</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{route.description}</p>
    <p className="mt-8 border-t border-line pt-6 text-base leading-relaxed text-muted">This screen is awaiting implementation. No room facts, costs, savings or action have been entered or assessed.</p>
    <nav aria-label="Preview journey navigation" className="mt-10 flex flex-wrap gap-4">
      {previous && <ButtonLink href={previous.href} secondary>Back</ButtonLink>}
      {next && <ButtonLink href={next.href}>Preview next screen →</ButtonLink>}
      {!next && <ButtonLink href="/" secondary>Return to start</ButtonLink>}
    </nav>
  </section>;
}
