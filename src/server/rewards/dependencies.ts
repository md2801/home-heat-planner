import { neon } from "@neondatabase/serverless";
import { serverAuth } from "../../lib/auth/server.ts";
import { createAccountStore } from "../account/store.ts";
import { createRewardStore } from "./store.ts";
import { assessProof, photoAssessmentAvailable } from "./assessment.ts";
function query(text: string, parameters: unknown[]) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database unavailable");
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(10000) } }).query(text, parameters);
}
export const rewardDependencies = {
  async getUser() {
    const { data, error } = await serverAuth().getSession();
    if (error) throw new Error("Session unavailable");
    return data?.user.id ?? null;
  },
  store: () => createRewardStore(query),
  draft: async (user: string) => (await createAccountStore(query).load(user)).draft,
  available: photoAssessmentAvailable,
  assess: assessProof,
};
