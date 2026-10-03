import type { AnswerValue, AssessmentAnswers } from "../../domain/models.ts";

export interface Choice { label: string; value: AnswerValue; icon?: "morning" | "afternoon" | "evening" | "overnight" }
export interface Question {
  id: string;
  title: string;
  context: "Your room" | "Your cooling" | "Your next step";
  why: string;
  hint?: string;
  unknownLabel?: string;
  kind: "choice" | "text" | "number" | "date";
  choices?: Choice[];
  multiple?: boolean;
  unit?: string;
  max?: number;
  min?: number;
  maxLength?: number;
  integer?: boolean;
}
const options = (...labels: [string, AnswerValue][]): Choice[] => labels.map(([label, value]) => ({ label, value }));
const yesNo = options(["Yes", true], ["No", false]);
export const WINDOW_DIRECTION_IDS = ["window1Orientation", "window2Orientation", "window3Orientation", "window4Orientation"] as const;
export const EQUIPMENT_QUESTION_IDS = ["fanType", "portableFanPosition", "acType", "acWall"] as const;
const directionChoices = options(["North", "north"], ["North-east", "north-east"], ["East", "east"], ["South-east", "south-east"], ["South", "south"], ["South-west", "south-west"], ["West", "west"], ["North-west", "north-west"]);
export const CORE_QUESTION_IDS = ["heatTiming", "position", "aboveRoom", "windowCount", ...WINDOW_DIRECTION_IDS, "windowOrientation", "externalShading", "insulation", "internalCoverings", "windowsOpen", "ventilationConstraints", "cooling", ...EQUIPMENT_QUESTION_IDS] as const;

export const questions: Question[] = [
  { id: "heatTiming", title: "When does it get hottest?", context: "Your room", kind: "choice", multiple: true, hint: "Choose one or more times.", choices: (["morning", "afternoon", "evening", "overnight"] as const).map(value => ({ label: value[0]!.toUpperCase() + value.slice(1), value, icon: value })), why: "The time you feel uncomfortable helps frame the room assessment. It doesn’t tell us the window direction or prove what causes the heat." },
  { id: "position", title: "Which floor is your bedroom on?", context: "Your room", kind: "choice", choices: options(["Ground floor", "ground-floor"], ["Upper floor", "upper-floor"]), why: "Room position is useful context. An upper-floor room isn’t necessarily directly below the roof." },
  { id: "aboveRoom", title: "What’s directly above your bedroom?", context: "Your room", kind: "choice", choices: options(["The roof", "roof"], ["Another room in my home", "another-room"], ["Another dwelling", "another-dwelling"]), why: "Roof exposure and shared building elements affect what needs to be checked before an improvement." },
  { id: "windowCount", title: "How many windows are in your bedroom?", context: "Your room", kind: "choice", choices: options(["No windows", 0], ["One", 1], ["Two", 2], ["Three", 3], ["Four", 4], ["More than four", "more-than-four"]), hint: "Count window units, not individual panes. The preview can draw up to four.", why: "Your answer sets the number of windows shown. Directions alone do not establish a count." },
  ...WINDOW_DIRECTION_IDS.map((id, index): Question => ({ id, title: `Which wall is window ${index + 1} on?`, context: "Your room", kind: "choice", choices: directionChoices, hint: "Choose the compass direction the window faces. Number your windows in any order and keep that order as you answer. Choose Not sure if you don’t know.", why: "Recording each window separately keeps its direction attached to the right window. The drawing doesn’t establish compass directions or exact positions." })),
  { id: "windowOrientation", title: "Which way do your windows face?", context: "Your room", kind: "choice", multiple: true, hint: "Select every direction, if known. With an unknown count or more than four windows, individual windows remain unassigned in the preview.", choices: directionChoices, why: "Compass directions must come from you. Sunlight in the illustration doesn’t establish your windows’ orientation." },
  { id: "externalShading", title: "Are your windows shaded outside?", context: "Your room", kind: "choice", choices: options(["All relevant windows have external shade", "all"], ["Some have external shade", "some"], ["None have external shade", "none"]), hint: "Think of awnings, eaves, trees or other outside shade. Indoor curtains are a separate question.", why: "External shade and internal coverings are different room details. Partial shading needs a closer window-by-window review." },
  { id: "insulation", title: "Is there ceiling or roof insulation?", context: "Your room", kind: "choice", choices: yesNo, hint: "Choose Not sure if you haven’t confirmed it.", why: "Insulation is hidden construction information. Room position or appearance can’t confirm whether it exists." },
  { id: "internalCoverings", title: "What covers your windows inside?", context: "Your room", kind: "choice", multiple: true, choices: options(["Curtains", "curtains"], ["Blinds", "blinds"], ["Shutters", "shutters"], ["No internal coverings", "none"]), why: "Existing coverings help describe your starting point. We won’t assume their performance or condition." },
  { id: "windowsOpen", title: "Can your bedroom windows open?", context: "Your room", kind: "choice", choices: options(["All relevant windows can open", "all"], ["Some can open", "some"], ["None can open", "none"]), why: "Openable windows and practical limits matter when considering ventilation. They don’t establish a cooling benefit." },
  { id: "ventilationConstraints", title: "What limits opening your windows?", context: "Your room", kind: "text", maxLength: 500, hint: "Describe security, noise, smoke or outdoor conditions. Enter “No known limits” only if that is true for you.", why: "A practical constraint may rule out an otherwise plausible action." },
  { id: "cooling", title: "How do you cool this bedroom?", context: "Your cooling", kind: "choice", multiple: true, choices: options(["Fan", "fan"], ["Air conditioner", "air-conditioner"], ["No cooling equipment", "none"]), why: "The preview shows only equipment you report. A generic symbol does not establish the model, type or performance." },
  { id: "fanType", title: "What kind of fan do you use?", context: "Your cooling", kind: "choice", choices: options(["Ceiling fan", "ceiling"], ["Portable fan", "portable"], ["Both ceiling and portable fans", "both"]), why: "The type comes from your answer. It does not establish the fan’s power, airflow or cooling benefit." },
  { id: "portableFanPosition", title: "Where do you usually put your portable fan?", context: "Your cooling", kind: "choice", choices: options(["Beside the bed", "beside-bed"], ["At the foot of the bed", "foot-of-bed"], ["Near a window", "near-window"], ["Near the door", "near-door"], ["Elsewhere in the room", "elsewhere"]), hint: "Choose its usual position. The room preview shows a schematic placement, not exact distances.", why: "Recording where you use the fan describes your room without assuming airflow or a temperature reduction." },
  { id: "acType", title: "What type of air conditioner serves this bedroom?", context: "Your cooling", kind: "choice", choices: options(["Wall-mounted split-system unit", "wall-mounted"], ["Window or wall unit", "window-mounted"], ["Portable unit", "portable"], ["Ducted system with ceiling vents", "ducted"], ["Another type", "other"]), why: "Unit type helps describe the room. It does not establish model, capacity, electrical consumption or efficiency." },
  { id: "acWall", title: "Which wall is your AC unit on?", context: "Your cooling", kind: "choice", choices: directionChoices, hint: "Choose the compass direction of the wall where the indoor unit is mounted. The preview labels the wall; its layout remains schematic.", why: "The wall direction must come from you. We won’t infer it from sunlight or from the window directions." },
  { id: "coolingUsage", title: "How do you use your cooling?", context: "Your cooling", kind: "text", maxLength: 500, hint: "Describe when you use the fan or air conditioner, and whether you use them together. Include the make and model if you know them; otherwise, leave those details out.", why: "Your equipment details and routine give context. We won’t infer power or operating hours from a model name or description." },
  { id: "location", title: "Where is your bedroom?", context: "Your room", kind: "text", maxLength: 100, hint: "Enter your Greater Sydney suburb or postcode. No street address needed. You’ll confirm the location at review.", why: "Location gives context for later guidance. We won’t guess a suburb from an ambiguous name or postcode." },
  { id: "goal", title: "What would you like to improve?", context: "Your room", kind: "text", maxLength: 500, hint: "For example, keeping heat out, staying comfortable on hot days, or using less cooling energy.", why: "Your heat and comfort priorities help guide which room improvements to investigate." },
  { id: "servesOnlyRoom", title: "Does that cooling serve only this room?", context: "Your cooling", kind: "choice", choices: yesNo, why: "A shared system’s consumption can’t automatically be attributed to one bedroom. Attribution evidence is checked at review." },
  { id: "energyBasis", title: "Do you have an energy reading for your bedroom’s cooling?", context: "Your cooling", kind: "choice", choices: options(["Yes, I have a reading", "measured"], ["No, help me estimate", "scenario"]), unknownLabel: "I don’t know / skip", hint: "Use a reading specifically for your cooling equipment, such as a dedicated meter or equipment energy monitor. A whole-home electricity bill won’t identify bedroom cooling. You can estimate or skip instead.", why: "A reading needs its total kWh, dates and measurement scope. An estimate uses your equipment power and operating-time assumptions and stays a what-if. Skipping leaves costs unknown; you can still continue to room guidance. A shared system’s total use cannot be assigned to this bedroom." },
  { id: "coolingKwh", title: "How much cooling energy was used in total?", context: "Your cooling", kind: "number", unit: "Total energy (kWh)", hint: "Enter the total kWh for the whole measured period, such as one day, a week or a month. We’ll ask for its start and end dates. Use the total, not a daily or hourly average.", why: "For example, if your cooling meter recorded 30 kWh over one week, enter 30 and use that week’s dates. Enter cooling-specific energy in kWh, not equipment power in kW or a whole-home electricity bill." },
  { id: "energyScope", title: "What does that measurement cover?", context: "Your cooling", kind: "text", maxLength: 500, hint: "Describe the cooling meter or record, which equipment it covers, and whether it includes other rooms.", why: "This records your account of the measurement. Evidence and bedroom attribution still need confirmation before a personalised estimate." },
  { id: "periodStart", title: "When does the measured period start?", context: "Your cooling", kind: "date", hint: "Use the start date of the same period as the total kWh you entered.", why: "Measured consumption needs its actual date range. We won’t assume it represents a month or year." },
  { id: "periodEnd", title: "When does the measured period end?", context: "Your cooling", kind: "date", hint: "Use the end date of the same period as the total kWh you entered. For a single day, use the same start and end date.", why: "The end date must be on or after the start date. Unknown dates leave the period unknown." },
  { id: "averageElectricalInputKw", title: "What average power should we use for your estimate?", context: "Your cooling", kind: "number", unit: "Average electrical input (kW)", hint: "For the equipment you described, enter an assumed average electrical input while it runs. Look for electrical input in its manual or label, not cooling capacity. Divide watts by 1,000 to get kW. Choose Not sure if you don’t know.", why: "For example, 60 W is 0.06 kW. If you include multiple devices, the assumption must cover their combined use during the hours you enter. Rated input is not necessarily the average: an air conditioner’s power varies as it runs. We won’t infer average power from equipment type or model. This remains a what-if estimate." },
  { id: "hoursPerDay", title: "How many hours per cooling day?", context: "Your cooling", kind: "number", unit: "hours per day", max: 24, hint: "Enter the operating hours per day covered by your average-power assumption. This is part of your estimate, not a measured reading.", why: "These hours are a user-entered scenario assumption, not a claimed effect of an improvement." },
  { id: "coolingDays", title: "How many days do you use cooling in that period?", context: "Your cooling", kind: "number", unit: "cooling days", integer: true, hint: "Count only the days your equipment runs during the period you want to estimate. We’ll ask you to describe that period next.", why: "Enter days when this equipment runs. We won’t multiply a short period into an annual estimate." },
  { id: "periodDescription", title: "Which period does your scenario cover?", context: "Your cooling", kind: "text", maxLength: 200, hint: "Name the stated period, such as a particular summer or date range. This flow does not annualise it.", why: "The period gives the cooling-day schedule its scope. No annual savings will be inferred." },
  { id: "flatTariffAudPerKwh", title: "What’s your flat electricity usage rate?", context: "Your cooling", kind: "number", unit: "AUD per kWh", hint: "Use dollars per kWh, not cents. Exclude fixed supply charges. Choose Not sure for time-of-use or an unknown rate.", why: "The initial calculator supports a flat usage rate. We won’t substitute a sample tariff." },
  { id: "budgetAud", title: "What could you spend now?", context: "Your next step", kind: "number", unit: "AUD", hint: "Enter a maximum budget, or choose Not sure. A larger improvement can still be investigated later.", why: "Your current spending limit helps frame affordability. It does not establish any improvement’s cost." },
  { id: "externalChangesPermitted", title: "Can you make external building changes?", context: "Your next step", kind: "choice", choices: options(["Yes, permission is confirmed", true], ["No, external changes are restricted", false]), hint: "Owning a home doesn’t automatically mean shared or external building changes are permitted.", why: "Permissions must be confirmed before treating an external or shared-building action as suitable." },
  { id: "willingToObtainQuotes", title: "Would you be willing to get quotes?", context: "Your next step", kind: "choice", choices: yesNo, why: "Quotes and professional checks may be a useful next step when cost or suitability is unknown." },
  { id: "baselineComfortRating", title: "How comfortable is your bedroom now?", context: "Your room", kind: "number", min: 1, max: 5, integer: true, hint: "Optional baseline: 1 very uncomfortable, 5 very comfortable. Choose Not sure to skip.", why: "Use the same scale and time of day when reviewing comfort after a change." },
  { id: "baselineComfortTime", title: "When does that comfort rating apply?", context: "Your room", kind: "choice", choices: options(["Morning", "morning"], ["Afternoon", "afternoon"], ["Evening", "evening"], ["Overnight", "overnight"]), why: "Comfort observations at different times of day are not directly comparable." },
  { id: "complaint", title: "What feels uncomfortable in your bedroom?", context: "Your room", kind: "text", maxLength: 500, hint: "Optional: describe the problem in your own words. Leave out addresses and personal details.", why: "Your description is retained for review. It does not establish a cause, temperature or equipment consumption." },
];
const reportedValue = (answers: AssessmentAnswers, id: string) => answers[id]?.status === "known" ? answers[id].value : undefined;
export function activeQuestions(answers: AssessmentAnswers): Question[] {
  const equipment = reportedValue(answers, "cooling");
  const hasEquipment = Array.isArray(equipment) && equipment.some(value => value === "fan" || value === "air-conditioner");
  const basis = reportedValue(answers, "energyBasis");
  const measured = ["coolingKwh", "energyScope", "periodStart", "periodEnd"];
  const scenario = ["averageElectricalInputKw", "hoursPerDay", "coolingDays", "periodDescription"];
  const count = reportedValue(answers, "windowCount");
  const individual = typeof count === "number" && count >= 1 && count <= WINDOW_DIRECTION_IDS.length;
  return questions.filter(q => {
    if (q.id === "fanType") return Array.isArray(equipment) && equipment.includes("fan");
    if (q.id === "portableFanPosition") return Array.isArray(equipment) && equipment.includes("fan") && ["portable", "both"].includes(String(reportedValue(answers, "fanType")));
    if (q.id === "acType") return Array.isArray(equipment) && equipment.includes("air-conditioner");
    if (q.id === "acWall") return Array.isArray(equipment) && equipment.includes("air-conditioner") && ["wall-mounted", "window-mounted"].includes(String(reportedValue(answers, "acType")));
    const windowIndex = WINDOW_DIRECTION_IDS.findIndex(id => id === q.id);
    if (windowIndex !== -1) return individual && windowIndex < count;
    if (q.id === "windowOrientation" && individual) return false;
    if (["windowOrientation", "externalShading", "internalCoverings", "windowsOpen", "ventilationConstraints"].includes(q.id) && reportedValue(answers, "windowCount") === 0) return false;
    if (q.id === "ventilationConstraints") return reportedValue(answers, "windowsOpen") !== "none";
    if (["servesOnlyRoom", "coolingUsage", "energyBasis"].includes(q.id)) return hasEquipment;
    if (measured.includes(q.id)) return hasEquipment && basis === "measured";
    if (scenario.includes(q.id)) return hasEquipment && basis === "scenario";
    if (q.id === "flatTariffAudPerKwh") return hasEquipment && (basis === "measured" || basis === "scenario");
    return true;
  });
}
/** Keep old room-wide reports readable while the new individual questions are answered. */
export function retainedAnswerIds(answers: AssessmentAnswers): Set<string> {
  const ids = new Set(activeQuestions(answers).map(q => q.id));
  if (reportedValue(answers, "windowCount") !== 0) ids.add("windowOrientation");
  return ids;
}
