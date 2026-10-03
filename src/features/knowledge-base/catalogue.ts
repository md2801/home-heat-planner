// Reviewed summaries of the linked guidance, not estimates for a particular home.
export const reviewedOn = "2026-10-03";
export const categories = {
  "heat-out": "Keep heat out",
  "cooling": "Cool efficiently",
  "everyday": "Everyday energy",
} as const;
export const efforts = {
  habit: "Everyday habit",
  "small-change": "Small change",
  "plan-ahead": "Plan ahead",
} as const;
export const sources = {
  summer: { title: "Summer energy savings", publisher: "energy.gov.au", url: "https://www.energy.gov.au/households/household-guides/seasonal-advice/summer" },
  shading: { title: "Shading", publisher: "YourHome", url: "https://www.yourhome.gov.au/passive-design/shading" },
  passive: { title: "Passive cooling", publisher: "YourHome", url: "https://www.yourhome.gov.au/passive-design/passive-cooling" },
  sealing: { title: "Ventilation and airtightness", publisher: "YourHome", url: "https://www.yourhome.gov.au/passive-design/ventilation-airtightness" },
  equipment: { title: "Heating and cooling", publisher: "YourHome", url: "https://www.yourhome.gov.au/energy/heating-and-cooling" },
  maintenance: { title: "Heating and cooling", publisher: "energy.gov.au", url: "https://www.energy.gov.au/households/heating-and-cooling" },
  lighting: { title: "Lighting", publisher: "YourHome", url: "https://www.yourhome.gov.au/energy/lighting" },
  appliances: { title: "Appliances", publisher: "energy.gov.au", url: "https://www.energy.gov.au/households/appliances" },
  insulation: { title: "Insulation", publisher: "YourHome", url: "https://www.yourhome.gov.au/passive-design/insulation" },
  environment: { title: "Zero energy and zero carbon homes", publisher: "YourHome", url: "https://www.yourhome.gov.au/live-adapt/zero-carbon" },
} as const;

export type Category = keyof typeof categories;
export type Effort = keyof typeof efforts;
export type Technique = {
  id: string;
  title: string;
  category: Category;
  effort: Effort;
  summary: string;
  benefit: string;
  steps: readonly string[];
  checks: readonly string[];
  sourceIds: readonly (keyof typeof sources)[];
};

export const techniques: readonly Technique[] = [
  {
    id: "close-curtains", title: "Close curtains before the sun arrives", category: "heat-out", effort: "habit",
    summary: "Use the blinds or curtains you already have on sunny windows.",
    benefit: "Less incoming sunlight can reduce the heat your cooling system needs to remove.",
    steps: ["Close coverings before direct sun reaches the glass.", "Reopen when the sun passes, if daylight and comfort allow."],
    checks: ["Internal coverings do not block sunlight as effectively as external shade."],
    sourceIds: ["summer", "shading"],
  },
  {
    id: "external-shade", title: "Shade the glass from outside", category: "heat-out", effort: "plan-ahead",
    summary: "Consider an adjustable awning or outdoor blind for an exposed window.",
    benefit: "Intercepting sunlight before it reaches glass can reduce cooling demand.",
    steps: ["Identify windows receiving direct summer sun.", "Ask about shade suited to their direction, while retaining winter sunlight."],
    checks: ["Check landlord or strata permission and installation requirements."],
    sourceIds: ["shading"],
  },
  {
    id: "cooler-air", title: "Let cooler outdoor air through", category: "cooling", effort: "habit",
    summary: "Use an evening breeze when outside air is cooler than inside.",
    benefit: "Suitable natural ventilation can release stored heat when outdoor air is cooler.",
    steps: ["Compare indoor and outdoor conditions before opening windows.", "Open safe openings on different sides to create an air path."],
    checks: ["Keep openings secure; avoid smoke, poor air quality and unsuitable humidity.", "Stop if incoming air makes the room hotter."],
    sourceIds: ["passive"],
  },
  {
    id: "draught-seals", title: "Seal unwanted window and door gaps", category: "heat-out", effort: "small-change",
    summary: "Try suitable weather strips or a removable door draught stopper.",
    benefit: "Reducing unwanted air leakage helps keep conditioned air inside.",
    steps: ["Check accessible frames for gaps when doors and windows are closed.", "Choose a seal that still lets the opening operate properly."],
    checks: ["Preserve required ventilation, especially with gas heaters; seek qualified advice if unsure.", "Watch for moisture and stale air after sealing."],
    sourceIds: ["sealing", "maintenance"],
  },
  {
    id: "fans", title: "Use a fan where you are sitting or sleeping", category: "cooling", effort: "habit",
    summary: "Try gentle air movement in the part of the room you are using.",
    benefit: "An existing fan can support comfort without cooling the whole room's air.",
    steps: ["Direct an existing fan towards the occupied area.", "Switch off when nobody needs its airflow."],
    checks: ["A personal fan cools people, rather than lowering room air temperature.", "Use effective cooling when a fan is insufficient for comfort or heat safety."],
    sourceIds: ["passive", "equipment"],
  },
  {
    id: "cool-used-rooms", title: "Cool the rooms you are using", category: "cooling", effort: "habit",
    summary: "Keep refrigerated cooling focused on occupied spaces.",
    benefit: "Conditioning less unused space can reduce electricity demand.",
    steps: ["Close doors to unused areas when suitable for your system.", "Keep exterior doors and windows closed while refrigerated AC runs."],
    checks: ["Evaporative cooling needs open outlets; follow system guidance and preserve required ventilation."],
    sourceIds: ["equipment"],
  },
  {
    id: "comfortable-setting", title: "Choose a comfortable, warmer AC setting", category: "cooling", effort: "habit",
    summary: "Avoid cooling the room more than you need.",
    benefit: "A less demanding thermostat setting can reduce cooling energy use.",
    steps: ["Raise the cooling setting gradually while checking comfort.", "Use a timer that matches when the room is occupied."],
    checks: ["Comfort and heat safety come first; needs differ between people."],
    sourceIds: ["equipment"],
  },
  {
    id: "clean-filters", title: "Keep AC filters clean", category: "cooling", effort: "small-change",
    summary: "Give existing equipment a chance to work efficiently.",
    benefit: "Maintenance can prevent faults and obstructions that increase energy use.",
    steps: ["Follow the manual for cleaning accessible filters and switching the unit off safely.", "Arrange qualified servicing for faults or inaccessible parts."],
    checks: ["Leave refrigerant, wiring and internal repairs to licensed technicians."],
    sourceIds: ["equipment", "maintenance"],
  },
  {
    id: "led-lighting", title: "Replace inefficient bulbs with LEDs", category: "everyday", effort: "small-change",
    summary: "Start with lights you use most often.",
    benefit: "Efficient bulbs deliver light using less electricity and can last longer.",
    steps: ["Match the brightness in lumens, fitting and dimmer compatibility.", "Turn lights off when they are unnecessary."],
    checks: ["Use an electrician for changes to fixed fittings or wiring."],
    sourceIds: ["lighting"],
  },
  {
    id: "standby-power", title: "Switch off unused electronics", category: "everyday", effort: "habit",
    summary: "Check the TV, console and other devices left on standby.",
    benefit: "Avoiding unnecessary standby consumption reduces electricity use.",
    steps: ["Identify devices that can safely be fully switched off.", "Turn them off at the power point when no longer needed."],
    checks: ["Keep fridges, medical equipment, security systems and necessary connected devices powered."],
    sourceIds: ["appliances", "summer"],
  },
  {
    id: "shade-plants", title: "Grow shade in the right place", category: "heat-out", effort: "plan-ahead",
    summary: "Use suitable plants to shade sun-exposed windows or walls.",
    benefit: "Living shade can reduce solar heat gain without powered equipment.",
    steps: ["Choose locally suitable, low-water plants where possible.", "Plan mature size and seasonal shade before planting."],
    checks: ["Allow winter sun where needed; keep roots clear of buildings and services."],
    sourceIds: ["shading"],
  },
  {
    id: "line-dry", title: "Let the air dry your laundry", category: "everyday", effort: "habit",
    summary: "Use a clothesline or rack when conditions allow.",
    benefit: "Skipping a powered drying cycle avoids its energy consumption.",
    steps: ["Hang clothes outside where practical and permitted.", "Use a ventilated location for an indoor rack."],
    checks: ["Avoid adding persistent moisture to a damp or poorly ventilated bedroom."],
    sourceIds: ["appliances"],
  },
  {
    id: "check-insulation", title: "Find out what insulation you have", category: "heat-out", effort: "plan-ahead",
    summary: "Start with records or a professional check before planning an upgrade.",
    benefit: "Suitable insulation slows heat transfer and can reduce heating and cooling demand.",
    steps: ["Ask for installation records or arrange a qualified assessment.", "Review gaps, climate suitability, shading and ventilation together."],
    checks: ["Avoid DIY roof-space inspection; electrical, fire and moisture risks need professional attention."],
    sourceIds: ["insulation"],
  },
  {
    id: "reduce-indoor-heat", title: "Move heat-producing chores out of peak heat", category: "everyday", effort: "habit",
    summary: "Rethink oven, dishwasher and laundry timing on hot days.",
    benefit: "Avoiding extra indoor heat can help keep occupied rooms more comfortable.",
    steps: ["Run heat-producing appliances during cooler parts of the day when practical.", "Choose a meal that needs less oven time."],
    checks: ["Check time-of-use rates separately: cooler timing does not guarantee a cheaper tariff."],
    sourceIds: ["summer"],
  },
];

export function filterTechniques(query: string, category: Category | "all", effort: Effort | "all") {
  const words = query.toLocaleLowerCase("en-AU").trim().split(/\s+/).filter(Boolean);
  return techniques.filter(technique => {
    if (category !== "all" && technique.category !== category) return false;
    if (effort !== "all" && technique.effort !== effort) return false;
    const searchable = [technique.title, technique.summary, technique.benefit, categories[technique.category], efforts[technique.effort], ...technique.steps, ...technique.checks].join(" ").toLocaleLowerCase("en-AU");
    return words.every(word => searchable.includes(word));
  });
}
