import type { Fact } from "./models";

export const unknown = (reason = "Not provided"): Fact<never> => ({ status: "unknown", reason });
