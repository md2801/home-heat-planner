import type { AnswerValue, AssessmentAnswers, Fact } from "../../domain/models.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { validAnswer } from "../assessment/state.ts";
import { questions } from "../assessment/questions.ts";
import { factText, proposedRoomProfile, titleCase } from "../room-baseline/model.ts";
import { unknown } from "../../domain/unknown.ts";

export type ContributorId = "window-solar" | "roof-ceiling" | "ventilation-limit";
export interface ContributorReason { fieldId: string; label: string; value: string; fact: Fact<AnswerValue> }
export interface Contributor {
  id: ContributorId;
  title: string;
  opportunity: string;
  status: "likely-contributor" | "worth-checking";
  summary: string;
  explanation: string;
  nextStep: string;
  reasons: ContributorReason[];
  unknowns: string[];
  sourceIds: string[];
}
export interface ContributorAssessment {
  contributors: Contributor[];
  gaps: string[];
  context: { id: "coverings" | "ventilation" | "cooling"; label: string; value: string }[];
  illustration: { roof: boolean; sun: boolean; externalShade: boolean; coolingEquipment: boolean };
}
const labels: Record<string, string> = { heatTiming: "Hottest times", aboveRoom: "Above the room", windowOrientation: "Window directions", externalShading: "External shade", insulation: "Insulation", windowsOpen: "Opening windows", ventilationConstraints: "Opening limits" };
/** Fixed, conservative rules. No scores, performance model, defaults or inferred window pairings. */
export function assessContributors(draft: AssessmentDraft): ContributorAssessment {
  const answers: AssessmentAnswers = Object.fromEntries(Object.entries(draft.answers).filter(([id, answer]) => {
    const q = questions.find(q => q.id === id);
    return q && validAnswer(q, answer) && (answer.status === "unknown" || answer.provenance.kind === "user-reported");
  }));
  const profile = proposedRoomProfile({ ...draft, answers }, "");
  const windows = profile.windowSummary!;
  const contributors: Contributor[] = [];
  const reason = (fieldId: string, value: string): ContributorReason => ({ fieldId, label: labels[fieldId]!, value, fact: answers[fieldId] ?? unknown("Not provided") });
  const timing = profile.heatTiming;
  const direction = windows.orientations;
  const shade = windows.externalShading;
  const times = timing.status === "known" ? timing.value : [];
  const directions = direction.status === "known" ? direction.value : [];
  // Only exact east/morning or west/afternoon-evening matches. No compass direction from prose.
  const matched = ((times.includes("afternoon") || times.includes("evening")) && directions.includes("west")) || (times.includes("morning") && directions.includes("east"));
  const someKnownSolarContext = matched || (times.some(time => time !== "overnight") && shade.status === "known" && shade.value === "none" && direction.status === "unknown");
  if (someKnownSolarContext && !(shade.status === "known" && shade.value === "all")) {
    const likely = matched && shade.status === "known" && shade.value === "none";
    contributors.push({ id: "window-solar", title: "Sun through windows", opportunity: likely ? "Investigate window shading" : "Check window sun exposure", status: likely ? "likely-contributor" : "worth-checking",
      summary: "Check direct sun and external shade when your room feels hot.",
      explanation: likely ? "Your reported heat timing, window direction and lack of external shade make sun through the windows a plausible contributor." : "Your answers make window exposure worth checking. They don’t establish which windows receive sun or how much shade they have.",
      nextStep: "Observe which windows receive direct sun when the room feels hot. Check seasonal shading and any permissions before considering changes.",
      reasons: [reason("heatTiming", factText(timing, v => v.map(titleCase).join(", "))), reason("windowOrientation", factText(direction, v => v.map(titleCase).join(", "))), reason("externalShading", factText(shade, v => ({ all: "All relevant windows shaded", some: "Some external shade", none: "No external shade" })[v]))],
      unknowns: [...(shade.status === "unknown" ? ["External shading · Not sure"] : []), ...(direction.status === "unknown" ? ["Window directions · Not sure"] : []), ...(shade.status === "known" && shade.value === "some" ? ["Which windows are shaded has not been established."] : []), "Direct sun at the reported hot times has not been observed here."], sourceIds: ["yourhome-shading"] });
  }
  if (profile.aboveRoom.status === "known" && profile.aboveRoom.value === "roof" && !(profile.insulation.status === "known" && profile.insulation.value)) {
    const absent = profile.insulation.status === "known" && !profile.insulation.value;
    contributors.push({ id: "roof-ceiling", title: "Roof and ceiling", opportunity: "Check ceiling insulation", status: absent ? "likely-contributor" : "worth-checking",
      summary: absent ? "Review the reported absence of insulation below your roof." : "Confirm what insulation is present below your roof.",
      explanation: absent ? "You report a roof directly above and no ceiling or roof insulation. Heat transfer through this part of the room is a plausible contributor." : "You report a roof directly above, but insulation is not known. Confirming it is a useful investigation, not evidence that insulation is absent.",
      nextStep: "Check building records or ask a qualified professional about the ceiling and roof insulation and its condition.",
      reasons: [reason("aboveRoom", "Roof directly above"), reason("insulation", factText(profile.insulation, v => v ? "Reported present" : "Reported absent"))],
      unknowns: [...(profile.insulation.status === "unknown" ? ["Insulation · Not sure"] : []), "Roof construction, insulation condition and actual heat transfer have not been established."], sourceIds: ["yourhome-insulation"] });
  }
  const opening = windows.opens;
  const limits = profile.ventilationConstraints;
  const describedLimits = limits.status === "known" ? limits.value.filter(text => !/^(no (known )?(limits|constraints|issues|problems|restrictions)|none|not applicable)[.!]?$/i.test(text.trim())) : [];
  if ((opening.status === "known" && opening.value !== "all") || describedLimits.length > 0) {
    const none = opening.status === "known" && opening.value === "none";
    contributors.push({ id: "ventilation-limit", title: "Limits on opening windows", opportunity: "Review opening constraints", status: none ? "likely-contributor" : "worth-checking",
      summary: "Check your opening options and the conditions for ventilation.",
      explanation: none ? "You report that none of the relevant windows can open. This limits window-based ventilation; the room’s actual airflow has not been measured." : opening.status === "known" && opening.value === "some" ? "You report that only some windows can open. Check how this affects when windows can be used; openability alone doesn’t establish airflow." : "You supplied a description of window use. Review it alongside your opening options; we haven’t interpreted the description as measured ventilation performance.",
      nextStep: "Review safe opening options and your stated constraints. Ventilation depends on airflow paths and suitable outdoor temperatures and air quality.",
      reasons: [reason("windowsOpen", factText(opening, v => ({ all: "All relevant windows can open", some: "Some can open", none: "None can open" })[v])), ...(describedLimits.length ? [reason("ventilationConstraints", describedLimits.join("; "))] : [])],
      unknowns: [...(opening.status === "unknown" ? ["Opening windows · Not sure"] : []), "Actual airflow and suitable outdoor conditions have not been established."], sourceIds: ["yourhome-passive-cooling"] });
  }
  const gaps = Object.keys(labels).filter(id => !answers[id] || answers[id]?.status === "unknown").map(id => `${labels[id]} · Not sure`);
  return { contributors, gaps, context: [
    { id: "coverings", label: "Internal coverings", value: factText(windows.internalCoverings, v => v.includes("none") ? "None reported" : v.map(titleCase).join(", ")) },
    { id: "ventilation", label: "Opening windows", value: factText(opening, v => ({ all: "All can open", some: "Some can open", none: "None can open" })[v]) },
    { id: "cooling", label: "Existing cooling", value: factText(profile.cooling, v => v.equipment.length ? v.equipment.map(item => item === "fan" ? "Fan" : "Air conditioner").join(" + ") : "None reported") },
  ], illustration: { roof: contributors.some(c => c.id === "roof-ceiling" && c.status === "likely-contributor"), sun: contributors.some(c => c.id === "window-solar" && c.status === "likely-contributor"), externalShade: shade.status === "known" && shade.value !== "none", coolingEquipment: profile.cooling.status === "known" && profile.cooling.value.equipment.includes("air-conditioner") } };
}
