export type HazardId = 'heatwaves' | 'floods' | 'storms' | 'bushfires' | 'earthquakes';
export type ResilienceEffort = 'Everyday preparation' | 'Plan ahead' | 'Professional help';
export type ResilienceSource = { title: string; publisher: string; url: string };
export type ResilienceHazard = {
  id: HazardId;
  title: string;
  subtitle: string;
  description: string;
  /** Existing home photographs illustrate preparation, not a hazard assessment. */
  image: string;
};
export type ResilienceTechnique = {
  id: string;
  hazard: HazardId;
  title: string;
  summary: string;
  benefit: string;
  effort: ResilienceEffort;
  /** Illustrative home-preparation photograph, not evidence of protection. */
  image: string;
  when: string;
  prepare: string[];
  steps: string[];
  checks: string[];
  sources: ResilienceSource[];
  relatedHref?: string;
};

// Manual review date applies to every source below; this is not a live warning feed.
export const reviewedOn = '2026-10-04';

export const hazards: ResilienceHazard[] = [
  {
    id: 'heatwaves', title: 'Heatwaves', subtitle: 'Keep heat out. Have a cooler place to go.',
    description: 'Prepare your rooms and your household before a run of hot days. Small changes can help, with a backup plan for extreme heat.',
    image: '/images/techniques/close-curtains.png',
  },
  {
    id: 'floods', title: 'Floods', subtitle: 'Protect essentials. Plan your way out.',
    description: 'Know your local flood information, get important belongings ready and plan early for evacuation or isolation.',
    image: '/images/techniques/shade-plants.png',
  },
  {
    id: 'storms', title: 'Storms', subtitle: 'Secure the outside. Prepare the inside.',
    description: 'Use calm weather to organise loose items, home maintenance and somewhere sheltered for your household.',
    image: '/images/techniques/external-shade.png',
  },
  {
    id: 'bushfires', title: 'Bushfires', subtitle: 'Prepare the property. Make a plan to leave.',
    description: 'Reduce combustible clutter and arrange appropriate maintenance well ahead of fire weather. Home preparation does not replace leaving early.',
    image: '/images/techniques/draught-seals.png',
  },
  {
    id: 'earthquakes', title: 'Earthquakes', subtitle: 'Practise the response. Review your home.',
    description: 'Earthquakes are geological hazards, not climate hazards. Household planning and appropriate building advice still belong in a resilient home.',
    image: '/images/techniques/check-insulation.png',
  },
];

const heatNow: ResilienceSource = {
  title: 'Keep cool, stay hydrated', publisher: 'NSW Health',
  url: 'https://www.health.nsw.gov.au/environment/beattheheat/Pages/health-in-hot-weather.aspx',
};
const heatPlan: ResilienceSource = {
  title: 'Plan ahead to beat the heat', publisher: 'NSW Health',
  url: 'https://www.health.nsw.gov.au/environment/beattheheat/Pages/prepare-for-heat.aspx',
};
const passiveCooling: ResilienceSource = {
  title: 'Passive cooling', publisher: 'Australian Government — Your Home',
  url: 'https://www.yourhome.gov.au/passive-design/passive-cooling',
};
const floodPlan: ResilienceSource = {
  title: 'Prepare for a flood', publisher: 'NSW State Emergency Service',
  url: 'https://www.ses.nsw.gov.au/plan-and-prepare/flood',
};
const emergencyKit: ResilienceSource = {
  title: 'Put together an emergency kit', publisher: 'NSW State Emergency Service',
  url: 'https://www.ses.nsw.gov.au/plan-and-prepare/emergency-kit',
};
const climateAdaptation: ResilienceSource = {
  title: 'Adapting to climate change', publisher: 'Australian Government — Your Home',
  url: 'https://www.yourhome.gov.au/live-adapt/adapting-climate-change',
};
const stormPlan: ResilienceSource = {
  title: 'Storm Season', publisher: 'NSW State Emergency Service',
  url: 'https://www.ses.nsw.gov.au/stormseason',
};
const stormReady: ResilienceSource = {
  title: 'Are you storm ready?', publisher: 'Victoria State Emergency Service',
  url: 'https://www.ses.vic.gov.au/news-and-media/campaigns/are-you-storm-ready',
};
const propertyPreparation: ResilienceSource = {
  title: 'Prepare your home and property for flood and storm', publisher: 'NSW State Emergency Service',
  url: 'https://www.ses.nsw.gov.au/plan-and-prepare/prepare-your-home',
};
const fireProperty: ResilienceSource = {
  title: 'Prepare your home', publisher: 'NSW Rural Fire Service',
  url: 'https://www.rfs.nsw.gov.au/plan-and-prepare/prepare-your-property',
};
const firePlan: ResilienceSource = {
  title: 'Bush fire survival plan', publisher: 'NSW Rural Fire Service',
  url: 'https://www.rfs.nsw.gov.au/plan-and-prepare/bush-fire-survival-plan',
};
const fireHazards: ResilienceSource = {
  title: 'Bush fire hazards and your property', publisher: 'NSW Rural Fire Service',
  url: 'https://www.rfs.nsw.gov.au/plan-and-prepare/know-your-risk/Bush-fire-hazards-and-your-property',
};
const earthquakeResponse: ResilienceSource = {
  title: 'Earthquake', publisher: 'Victoria State Emergency Service',
  url: 'https://www.ses.vic.gov.au/plan-and-stay-safe/emergencies/earthquake',
};
const earthquakeBuildings: ResilienceSource = {
  title: 'Resilience to the shake: protecting older buildings', publisher: 'Geoscience Australia',
  url: 'https://www.ga.gov.au/news/resilience-to-the-shake',
};

export const techniques: ResilienceTechnique[] = [
  {
    id: 'heat-shade-windows', hazard: 'heatwaves', title: 'Block the sun before rooms warm up',
    summary: 'Use existing curtains and blinds to shade sun-facing rooms before the hottest part of the day.',
    benefit: 'Blocking direct sun helps limit heat entering the spaces where you rest and sleep.', effort: 'Everyday preparation',
    image: '/images/techniques/close-curtains.png', when: 'Before the sun reaches your windows',
    prepare: ['Working curtains or blinds', 'A cooler room to use'],
    steps: ['Notice which rooms receive direct sun in the morning and afternoon.', 'Close their coverings before the room warms up.', 'Spend peak heat in the coolest available part of your home.'],
    checks: ['Coverings alone may not keep a home cool enough during extreme heat.'],
    sources: [heatNow], relatedHref: '/knowledge-base#close-curtains',
  },
  {
    id: 'heat-cooler-air', hazard: 'heatwaves', title: 'Make use of cooler outdoor air',
    summary: 'Let cooler outdoor air through safe openings when temperature and air quality are suitable.',
    benefit: 'A clear breeze path can help remove heat that has accumulated indoors.', effort: 'Everyday preparation',
    image: '/images/techniques/cooler-air.png', when: 'When outdoors is cooler than indoors',
    prepare: ['Safe opening windows', 'A clear airflow path', 'Outdoor air-quality information'],
    steps: ['Check that outdoor air is cooler and suitable to bring inside.', 'Open safe windows or doors to create an unobstructed airflow path.', 'Close or adjust openings when heat, smoke or other conditions change.'],
    checks: ['Consider security, insects and outdoor air quality. Keep openings closed when smoke or unsafe conditions make ventilation unsuitable.'],
    sources: [heatNow, passiveCooling], relatedHref: '/knowledge-base#cooler-air',
  },
  {
    id: 'heat-backup-plan', hazard: 'heatwaves', title: 'Choose a cooler backup destination',
    summary: 'Identify somewhere cooler, how to get there and who can help if your home becomes uncomfortable.',
    benefit: 'A backup destination gives your household an option if indoor heat or a power outage disrupts plans.', effort: 'Plan ahead',
    image: '/images/techniques/cool-used-rooms.png', when: 'Before summer or forecast hot weather',
    prepare: ['Nearby cooler destinations', 'Transport arrangements', 'Household and support contacts'],
    steps: ['Find a cooler public building, such as a library, and check access arrangements.', 'Plan a safe journey that accounts for mobility and household needs.', 'Agree on check-ins with family or neighbours and save their contact details.'],
    checks: ['Plan for mobility, transport and pets. Follow NSW Health advice for individual health needs.'],
    sources: [heatPlan],
  },
  {
    id: 'flood-household-plan', hazard: 'floods', title: 'Plan the route before water rises',
    summary: 'Agree where to go, how to get there and what your household needs if flooding affects the area.',
    benefit: 'A shared plan makes leaving or preparing for isolation less confusing.', effort: 'Plan ahead',
    image: '/images/techniques/check-insulation.png', when: 'Before heavy rain or flood warnings',
    prepare: ['Local flood information', 'Destination and route options', 'Pet and support needs'],
    steps: ['Review local flood information and possible road or access disruptions.', 'Choose a destination and discuss transport for everyone, including pets.', 'Share the plan and follow official warnings and evacuation advice.'],
    checks: ['Never plan a route through floodwater. Include possible isolation.'],
    sources: [floodPlan, propertyPreparation],
  },
  {
    id: 'flood-protect-belongings', hazard: 'floods', title: 'Prepare belongings for higher storage',
    summary: 'List important movable possessions and decide where they can be stored before floodwater arrives.',
    benefit: 'Knowing what to move first reduces last-minute decisions about belongings.', effort: 'Plan ahead',
    image: '/images/techniques/standby-power.png', when: 'Plan early; move items only while safe',
    prepare: ['Priority belongings list', 'Suitable higher storage', 'Help with bulky items'],
    steps: ['Identify valuables and movable possessions that need priority attention.', 'Choose accessible higher storage and arrange help where needed.', 'Move items and secure floatable belongings only before conditions become unsafe.'],
    checks: ['Act only while safe, before flooding. Do not delay leaving to save possessions.'],
    sources: [floodPlan, propertyPreparation],
  },
  {
    id: 'flood-resilient-repairs', hazard: 'floods', title: 'Plan repairs with water in mind',
    summary: 'Use your next repair or renovation to discuss water-resistant materials, drainage and vulnerable service locations.',
    benefit: 'Site-specific design can address how water enters, drains away and affects building materials.', effort: 'Professional help',
    image: '/images/techniques/external-shade.png', when: 'Before planning repairs or renovation work',
    prepare: ['Building plans or records', 'Local flood information', 'Questions for your designer'],
    steps: ['Gather building records and relevant local flood information for the appointment.', 'Discuss water-resistant materials and drainage with a qualified building professional.', 'Ask an engineer whether vulnerable services need relocation and what approvals apply.'],
    checks: ['Changes need site-specific design and any required approvals. Do not redirect water onto neighbouring properties or move electrical services yourself.'],
    sources: [climateAdaptation],
  },
  {
    id: 'storm-loose-items', hazard: 'storms', title: 'Give loose outdoor items a home',
    summary: 'Make a storage plan for outdoor furniture, toys and other loose objects before strong winds arrive.',
    benefit: 'Putting loose objects away reduces the items exposed to being blown around.', effort: 'Everyday preparation',
    image: '/images/techniques/line-dry.png', when: 'In calm weather before a forecast storm',
    prepare: ['Outdoor items checklist', 'Suitable indoor storage', 'Help for large items'],
    steps: ['Walk around the yard or balcony and identify loose belongings.', 'Decide what can go indoors and what needs appropriate securing.', 'Complete the move while conditions are calm and safe.'],
    checks: ['Prepare in calm conditions; do not go outside into a storm to retrieve items.'],
    sources: [stormReady],
  },
  {
    id: 'storm-maintenance', hazard: 'storms', title: 'Book a roof and drainage check',
    summary: 'Bring roof leaks, gutter blockages and overhanging branches into one maintenance conversation.',
    benefit: 'Early checks give you time to arrange repairs before heavy rain and wind expose existing problems.', effort: 'Professional help',
    image: '/images/techniques/external-shade.png', when: 'Before storm season, during safe weather',
    prepare: ['Known leaks or maintenance concerns', 'Roof and gutter service contacts', 'Tree-work advice if needed'],
    steps: ['List known leaks and drainage concerns without climbing onto the roof.', 'Arrange professional checks of roof damage, gutters, downpipes and drains.', 'Ask an appropriate professional to assess branches that could fall onto the property.'],
    checks: ['Use appropriate professionals for roofs, heights and trees near powerlines.'],
    sources: [stormPlan, propertyPreparation],
  },
  {
    id: 'storm-shelter-plan', hazard: 'storms', title: 'Choose your sheltered place',
    summary: 'Choose a sheltered place at home and discuss an alternative if your household needs to leave.',
    benefit: 'Everyone has a common destination and knows where to find updates as conditions change.', effort: 'Plan ahead',
    image: '/images/techniques/cool-used-rooms.png', when: 'Before severe weather is forecast',
    prepare: ['A sheltered indoor location', 'An alternative destination', 'Official warning channels'],
    steps: ['Identify a secure sheltered place and account for local flood exposure.', 'Agree on an alternative destination and how your household would reach it.', 'Share arrangements and keep official warnings and emergency advice accessible.'],
    checks: ['Account for flooding as well as wind. Follow emergency-service instructions.'],
    sources: [stormPlan],
  },
  {
    id: 'fire-clear-clutter', hazard: 'bushfires', title: 'Reduce dry clutter around the house',
    summary: 'Review leaves, dry garden debris and other combustible clutter around the house before fire season.',
    benefit: 'Regular upkeep reduces material near buildings that could fuel a fire.', effort: 'Everyday preparation',
    image: '/images/techniques/shade-plants.png', when: 'Well before fire weather arrives',
    prepare: ['A yard maintenance checklist', 'Garden-waste disposal arrangements', 'Local vegetation rules'],
    steps: ['Identify accumulations of dry leaves, twigs and combustible garden clutter.', 'Remove debris through appropriate disposal and maintain lawns.', 'Arrange safe management of overhanging vegetation after checking local requirements.'],
    checks: ['Check local vegetation rules. Never burn debris without the required approvals.'],
    sources: [fireProperty, fireHazards],
  },
  {
    id: 'fire-ember-gaps', hazard: 'bushfires', title: 'Arrange an ember-entry inspection',
    summary: 'Ask a professional to review damaged roofing, exterior gaps and screening as part of bushfire preparation.',
    benefit: 'A property-specific inspection helps identify maintenance that can address possible ember entry.', effort: 'Professional help',
    image: '/images/techniques/draught-seals.png', when: 'Before fire season or exterior renovation',
    prepare: ['Existing building records', 'Known gaps or damaged areas', 'Questions about suitable products'],
    steps: ['List known roof damage or exterior gaps for a professional to inspect.', 'Discuss appropriate metal screens, seals and gutter maintenance for the property.', 'Confirm suitable products, required approvals and who will complete the work.'],
    checks: ['Use bushfire-appropriate products and approvals; ordinary draught sealing is not a bushfire rating.'],
    sources: [fireProperty],
  },
  {
    id: 'fire-leave-plan', hazard: 'bushfires', title: 'Agree when and where to leave',
    summary: 'Talk through your leaving arrangements together, using the RFS guide while everyone has time to plan.',
    benefit: 'A written plan reduces the decisions your household must make when a fire threatens.', effort: 'Plan ahead',
    image: '/images/techniques/check-insulation.png', when: 'Before bushfire season, then review together',
    prepare: ['RFS household planning guide', 'Leaving and transport arrangements', 'Current fire-information sources'],
    steps: ['Use the RFS guide to discuss when your household will leave.', 'Agree where to go, transport arrangements and who needs additional help.', 'Keep the plan accessible and learn where to check current fire information.'],
    checks: ['Preparing a property does not make staying safe. Follow current RFS advice and warnings.'],
    sources: [firePlan],
  },
  {
    id: 'quake-practise-response', hazard: 'earthquakes', title: 'Practise drop, cover and hold',
    summary: 'Identify suitable cover in familiar rooms and practise a response that fits everyone’s mobility.',
    benefit: 'Rehearsal helps household members recognise nearby cover and remember what to do during shaking.', effort: 'Plan ahead',
    image: '/images/techniques/cooler-air.png', when: 'During a household emergency-plan review',
    prepare: ['Nearby sturdy cover', 'SES response guidance', 'Mobility and communication needs'],
    steps: ['Identify sturdy cover away from windows and objects that could fall.', 'Practise dropping, protecting your head and neck, and holding on.', 'Discuss staying inside until shaking stops and it is safe to move.'],
    checks: ['Adapt the practice for mobility needs using SES guidance. Do not run outside during shaking.'],
    sources: [earthquakeResponse],
  },
  {
    id: 'quake-essential-kit', hazard: 'earthquakes', title: 'Prepare for disrupted services',
    summary: 'Put essential supplies and contact details in a known location that your household can access easily.',
    benefit: 'A prepared kit keeps useful items together if power, water or normal access is interrupted.', effort: 'Plan ahead',
    image: '/images/techniques/standby-power.png', when: 'Before an emergency; review your kit regularly',
    prepare: ['A sturdy waterproof container', 'Household emergency checklist', 'Medical and personal needs list'],
    steps: ['Pack suitable water, food, lighting, radio, batteries and first-aid supplies.', 'Include contacts and a list of medicines or equipment to add when needed.', 'Show everyone where the kit is and review its contents as needs change.'],
    checks: ['Use the official checklist to match supplies to your household.'],
    sources: [emergencyKit],
  },
  {
    id: 'quake-building-advice', hazard: 'earthquakes', title: 'Ask about older masonry',
    summary: 'If you own an older masonry home, include earthquake resilience in your next renovation discussion.',
    benefit: 'A structural engineer can assess whether strengthening options are appropriate for your particular building.', effort: 'Professional help',
    image: '/images/techniques/check-insulation.png', when: 'Before planning structural work or renovations',
    prepare: ['Building age and construction records', 'Previous renovation information', 'Questions for a structural engineer'],
    steps: ['Gather available records about the building’s age, construction and earlier alterations.', 'Discuss Geoscience Australia’s retrofit resources with a qualified structural engineer.', 'Request advice on suitable design, approvals and how work could fit planned renovations.'],
    checks: ['Suitability and approvals depend on the building. Structural retrofits require professional assessment and design.'],
    sources: [earthquakeBuildings],
  },
];
