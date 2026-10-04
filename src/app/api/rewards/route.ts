import { createRewardsHandler } from "@/server/rewards/http";
import { rewardDependencies } from "@/server/rewards/dependencies";
export const runtime = "nodejs";
const handle = createRewardsHandler(rewardDependencies);
export { handle as GET, handle as POST };
