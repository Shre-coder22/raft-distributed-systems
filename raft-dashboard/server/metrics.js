import { promises as fs } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const nowMs = () => Math.round(performance.now());

async function ensureCsv(file, header) {
  try { await fs.access(file); }
  catch { await fs.writeFile(file, header.join(",") + "\n"); }
}

export async function initMetrics({
  dir = "./metrics",
  scenario = "leader_crash_restart",
  seed = 0,
  trial = 1,
  timeoutLowMs = 600,
  timeoutHighMs = 1000
} = {}) {
  await fs.mkdir(dir, { recursive: true });
  const failover = path.join(dir, "failover_trials.csv");
  const repl     = path.join(dir, "replication_latency.csv");
  const tenure   = path.join(dir, "leader_tenure.csv");

  await ensureCsv(failover, ["scenario","timeout_low_ms","timeout_high_ms","seed","trial","old_leader","new_leader","crash_time_ms","election_start_ms","leader_elected_ms","first_heartbeat_ms","failover_ms"]);
  await ensureCsv(repl,    ["scenario","drop_rate","seed","trial","entry_id","leader_term","start_ts_ms","commit_ts_ms","latency_ms"]);
  await ensureCsv(tenure,  ["scenario","seed","trial","leader_id","term","start_ts_ms","end_ts_ms","tenure_ms"]);

  let lastLeaderId = -1, lastLeaderFrom = -1;
  let crashTimeMs = 0, electStartMs = 0, electedMs = 0, firstHbMs = 0;

  async function append(p, row) { await fs.appendFile(p, row.join(",") + "\n"); }

  return {
    tags: { scenario, seed, trial, timeoutLowMs, timeoutHighMs },

    async recordLeaderCrash(oldLeaderId)       { crashTimeMs = nowMs(); },
    async recordElectionStart()                { electStartMs = nowMs(); },
    async recordLeaderElected(newLeaderId, term) {
      electedMs = nowMs();
      if (lastLeaderFrom >= 0 && lastLeaderId >= 0) {
        await append(tenure, [scenario, String(seed), String(trial), String(lastLeaderId), String(term-1), String(lastLeaderFrom), String(electedMs), String(electedMs - lastLeaderFrom)]);
      }
      lastLeaderId = newLeaderId; lastLeaderFrom = electedMs;
    },
    async recordFirstHeartbeat(newLeaderId) {
      firstHbMs = nowMs();
      const failoverMs = firstHbMs - (crashTimeMs || electedMs);
      await append(failover, [
        scenario, String(timeoutLowMs), String(timeoutHighMs), String(seed), String(trial),
        "-1", String(newLeaderId),
        String(crashTimeMs), String(electStartMs), String(electedMs), String(firstHbMs), String(failoverMs)
      ]);
    },

    startTimes: new Map(),
    async recordStartCommand(entryId, leaderTerm, dropRate=0.0) {
      this.startTimes.set(entryId, nowMs());
    },
    async recordCommit(entryId, leaderTerm, dropRate=0.0) {
      const start = this.startTimes.get(entryId); if (start == null) return;
      const commit = nowMs();
      await append(repl, [scenario, dropRate.toFixed(2), String(seed), String(trial), String(entryId), String(leaderTerm), String(start), String(commit), String(commit - start)]);
      this.startTimes.delete(entryId);
    }
  };
}