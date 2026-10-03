export const journeyRoutes = [
  { href: "/", title: "Home Heat Planner", description: "Understand your bedroom, compare suitable cooling improvements and plan your next step." },
  { href: "/assessment", title: "Your room assessment", description: "Room details, cooling use and practical constraints will be collected here." },
  { href: "/room-baseline", title: "Your room and cooling baseline", description: "Confirmed facts, unknowns and traceable cooling-cost inputs will be reviewed here." },
  { href: "/heat-contributors", title: "Heat contributors", description: "Evidence-backed explanations of plausible contributors will appear here." },
  { href: "/cooling-options", title: "Your room improvements", description: "Suitable options, known costs and supported comparisons will appear here." },
  { href: "/cooling-plan", title: "My room plan", description: "A selected action, checklist and optional check-in date will be saved here." },
  { href: "/follow-up", title: "Your room plan follow-up", description: "Progress, actual spending and observational reviews of usage and comfort will be recorded here." },
] as const;

export type JourneyPath = (typeof journeyRoutes)[number]["href"];
