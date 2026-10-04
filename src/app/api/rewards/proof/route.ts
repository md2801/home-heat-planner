import { createProofHandler } from "@/server/rewards/http";
import { rewardDependencies } from "@/server/rewards/dependencies";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createProofHandler(rewardDependencies);
