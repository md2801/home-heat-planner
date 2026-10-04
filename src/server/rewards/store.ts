import { randomUUID, randomBytes } from "node:crypto";
import { demoRewards } from "../../features/marketplace/catalogue.ts";
import type { RewardsSnapshot, RewardStatus } from "../../contracts/rewards.ts";
import { rewardCatalogueVersion, type RewardReason, type RewardTask } from "../../features/rewards/catalogue.ts";
import type { JourneyQuery } from "../journey/postgres.ts";

type Wallet = Omit<RewardsSnapshot, "tasks" | "assessmentAvailable">;
export function createRewardStore(query: JourneyQuery) {
  return {
    async read(user: string): Promise<Wallet> {
      // One PostgreSQL statement reads a consistent wallet/ledger snapshot.
      const rows = await query(`SELECT jsonb_build_object(
        'balance', COALESCE((SELECT balance FROM heat_planner_reward_wallets WHERE user_id=$1),0),
        'earned', COALESCE((SELECT sum(delta) FROM heat_planner_reward_ledger WHERE user_id=$1 AND delta>0),0),
        'completed', (SELECT count(*) FROM heat_planner_reward_attempts WHERE user_id=$1 AND status='approved'),
        'coupons', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'rewardId',reward_id,'code',code,'coins',coins,'createdAt',created_at) ORDER BY created_at DESC)
          FROM heat_planner_reward_coupons WHERE user_id=$1),'[]'::jsonb),
        'attempts', COALESCE((SELECT jsonb_agg(v ORDER BY v->>'createdAt' DESC) FROM
          (SELECT jsonb_build_object('id',id,'taskId',task_id,'title',title,'coins',coins,
            'status',CASE WHEN status='checking' AND created_at < now()-interval '2 minutes' THEN 'unavailable' ELSE status END,
            'reason',CASE WHEN status='checking' AND created_at < now()-interval '2 minutes' THEN 'service-unavailable' ELSE reason END,
            'createdAt',created_at,'photoCount',jsonb_array_length(proof_hashes)) v
          FROM heat_planner_reward_attempts WHERE user_id=$1 AND (status='approved' OR id IN
            (SELECT id FROM heat_planner_reward_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30))) a),'[]'::jsonb),
        'entries', COALESCE((SELECT jsonb_agg(v ORDER BY v->>'createdAt' DESC) FROM
          (SELECT jsonb_build_object('id',id,'delta',delta,'title',title,'createdAt',created_at) v
          FROM heat_planner_reward_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30) l),'[]'::jsonb)
        ) AS wallet`, [user]);
      if (!rows[0]?.wallet) throw new Error("Wallet unavailable");
      return rows[0].wallet as Wallet;
    },
    async begin(user: string, task: RewardTask, hashes: string[]) {
      const id = randomUUID();
      const rows = await query("SELECT heat_planner_begin_reward($1,$2::uuid,$3,$4,$5,$6::jsonb,$7) AS result", [user, id, task.id, task.title, task.coins, JSON.stringify(hashes), rewardCatalogueVersion]);
      if (!rows[0]) throw new Error("Claim unavailable");
      return { id, result: String(rows[0].result) };
    },
    async finish(user: string, id: string, status: Exclude<RewardStatus, "checking">, reason: RewardReason) {
      const rows = await query("SELECT heat_planner_finish_reward($1,$2::uuid,$3,$4,$5::uuid) AS result", [user, id, status, reason, randomUUID()]);
      if (!rows[0]) throw new Error("Assessment unavailable");
      return String(rows[0].result);
    },
    async redeem(user: string, rewardId: string) {
      const reward = demoRewards.find(item => item.id === rewardId);
      if (!reward) throw new Error("Unknown reward");
      const rows = await query("SELECT heat_planner_redeem_reward($1,$2::uuid,$3,$4,$5,$6,$7::uuid) AS result", [user, randomUUID(), reward.id, reward.points, `HHP-DEMO-${randomBytes(6).toString("hex").toUpperCase()}`, reward.name, randomUUID()]);
      if (!rows[0]) throw new Error("Redemption unavailable");
      return String(rows[0].result);
    },
  };
}
