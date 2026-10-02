import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import { validCalendarDate } from "./model.ts";
export function calendarReminder(plan: CoolingPlanDraft, origin: string, now: string): string {
  if (plan.savedAt.status !== "known" || plan.checkInDate.status !== "known" || !validCalendarDate(plan.checkInDate.value)) throw new Error("Save a plan with a valid check-in date first");
  const url = new URL(origin);
  if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Invalid return URL");
  const date = plan.checkInDate.value;
  const end = new Date(`${date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
  let hash = 2166136261; for (const c of plan.id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const escape = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Home Heat Planner//Check-in//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${(hash >>> 0).toString(16)}@home-heat-planner`, `DTSTAMP:${new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, "")}`, "SUMMARY:Review your cooling plan", `DESCRIPTION:${escape(`Review your progress, spending, usage and comfort. Return to ${url.origin}/follow-up. Manage this imported reminder in your calendar.`)}`, `URL:${url.origin}/follow-up`, "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT9H", "DESCRIPTION:Review your cooling plan", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => line.match(/.{1,73}/g)?.join("\r\n ") ?? "").join("\r\n") + "\r\n";
}
export function downloadCalendar(plan: CoolingPlanDraft) {
  const text = calendarReminder(plan, window.location.origin, new Date().toISOString());
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "cooling-plan-check-in.ics"; link.click(); URL.revokeObjectURL(url);
}
