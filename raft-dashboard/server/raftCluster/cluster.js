import { steps } from "./steps.js";
import { nodePositions } from "./positions.js";
import { initMetrics } from "../metrics.js";

const METRICS = await initMetrics({
  dir: "./metrics",
  scenario: process.env.RAFT_SCENARIO || "leader_crash_restart",
  seed: Number(process.env.RAFT_SEED || 0),
  trial: Number(process.env.RAFT_TRIAL || 1),
  timeoutLowMs: 600, timeoutHighMs: 1000,
});

let firstHBSentForTerm = new Set(); 
const entryIdByKey = new Map();  // key -> numeric id
let nextEntryId = 1;
const ensureEntryIdForKey = (key) => {
  let id = entryIdByKey.get(key);
  if (!id) { id = nextEntryId++; entryIdByKey.set(key, id); }
  return id;
};
const committedIndexEmitted = new Set();

/* =========================
   Module state
   ========================= */
let currentStep = 0;
let isRunning = false;
let globalDropRate = 0.0;
let currentTerm = 0;

const MODE_STATIC = "static";
const MODE_DYNAMIC = "dynamic";
const MODE_ELECTION = "election";
let mode = MODE_STATIC;

let crashedNodes = new Set();
let forceTimeoutNodes = new Set();

let runtime = null;        // { [id]: { role, term, votedFor, log, ... } }
let lastMessages = [];
let prevLeaderSnapshot = null; // { id, term, log: [...] } captured entering election
const shouldDrop = () => Math.random() < globalDropRate;

/* Module Flag */
let lastResetReason = null;

/* === In-flight message transport (for dynamic/election) === */
let inflight = []; // [{ id, type, fromId, toId, payload, sendAt, arriveAt, onDeliver }]
let _msgId = 1;
const BALL_TRAVEL_MS = 1200;
const ACK_TRAVEL_MS = 900;

// election tallies (asynchronous votes)
let electionCandidates = []; // [ids]
let voteTally = {};          // { [candidateId]: number }

/* =========================
   Helpers / timing
   ========================= */
const ids = () => Object.keys(runtime || {}).map(Number).sort((a, b) => a - b);
const now = () => Date.now();

const updateDropRateForTerm = (newTerm) => {
  if (newTerm !== currentTerm) {
    currentTerm = newTerm;
    globalDropRate = Math.random() * 0.2;
    console.log(`[DropRate] New term=${newTerm}, dropRate=${(globalDropRate*100).toFixed(1)}%`);
  }
};

const HEARTBEAT_MS = 2400;                
const ELECTION_TIMEOUT_MIN = 5000;        
const ELECTION_TIMEOUT_JITTER = 2500;

const randomElectionTimeout = () =>
  ELECTION_TIMEOUT_MIN + Math.floor(Math.random() * ELECTION_TIMEOUT_JITTER);

const nextElectionDeadline = () =>
  now() + randomElectionTimeout() + Math.floor(Math.random() * 300);

// No partitions / drops anymore
const reachable = () => true;
const shouldDeliver = () => true;

const getLeaderId = () => ids().find((id) => runtime?.[id]?.role === "leader" && !crashedNodes.has(id));

let committedLogs = [];

// helpers
const aliveIds = () => ids().filter((id) => !crashedNodes.has(id));
const majorityAlive = () => Math.floor(aliveIds().length / 2) + 1;

const entryKey = (e) => e ? `${e.term}|${e.command}` : "";
const entriesEqual = (a, b) => !!a && !!b && a.term === b.term && a.command === b.command;
const hasCommittedPrefix = (r) => {
  if (!r || !Array.isArray(r.log)) return false;
  if (r.log.length < committedLogs.length) return false;
  for (let i = 0; i < committedLogs.length; i++) {
    const a = r.log[i], b = committedLogs[i];
    if (!a || a.term !== b.term || a.command !== b.command) return false;
  }
  return true;
};

/* =========================
   In-flight queue helpers
   ========================= */
// schedule a pulse; if it’s “dropped”, we still render the ball but do no state mutation on deliver
const scheduleBall = ({
  type,
  fromId,
  toId,
  payload = {},
  travelMs = BALL_TRAVEL_MS,
  onDeliver,
}) => {
  const t = now();
  const dropped = shouldDrop();   

  const msg = {
    id: _msgId++,
    type,                 // keep base type (appendEntries, appendEntriesReply, requestVote, voteGiven, elected, etc.)
    fromId,
    toId,
    payload,
    sendAt: t,
    arriveAt: t + travelMs,
    dropped,             
    onDeliver: dropped ? null : (typeof onDeliver === "function" ? onDeliver : () => {}),
  };

  inflight.push(msg);
  return msg;
};

const deliverDueMessages = () => {
  const t = now();
  if (inflight.length === 0) return;
  const due = inflight.filter(m => m.arriveAt <= t);
  if (due.length === 0) return;
  inflight = inflight.filter(m => m.arriveAt > t);
  for (const m of due) {
    try { m.onDeliver?.(m); } catch (e) {}
  }
};

/* =========================
   Static + Dynamic state projection
   ========================= */
const getRawStepData = (stepIndex) =>
  steps[stepIndex] || steps[steps.length - 1];

export const getFilteredState = (stepIndex = currentStep) => {
  // Dynamic/Election: nodes from runtime + show in-flight balls
  if ((mode === MODE_DYNAMIC || mode === MODE_ELECTION) && runtime) {
    const nodesArr = ids().map((id, i) => {
      const r = runtime[id];
      const status = crashedNodes.has(id) ? "crashed" : "healthy";
      return {
        id,
        role: r.role,
        state: r.role,
        status,
        term: r.term,
        log: r.log || [], 
        position: nodePositions[i] || { left: 50, top: 50 },
        lossPct: r.lossPct ?? 0, 
      };
    });

    const msgs = inflight.map(m => ({
      fromId: m.fromId,
      toId: m.toId,
      type: m.dropped ? `${m.type}(drop)` : m.type, 
    }));

    return { step: stepIndex, mode, nodes: nodesArr, messages: msgs, committed: committedLogs.slice(), dropRate: globalDropRate };
  }

  // Static movie projection
  const raw = getRawStepData(stepIndex);
  return {
    step: stepIndex,
    mode,
    nodes: (raw.nodes || []).map((n, i) => ({
      ...n,
      role: (n.role ?? n.state ?? "").toLowerCase(),
      state: n.state ?? n.role ?? "",
      status: "healthy",
      position: nodePositions[i] || { left: 50, top: 50 },
      log: n.log || [],
    })),
    messages: (raw.messages || []).map((m) => ({
      fromId: m.fromId ?? m.from,
      toId: m.toId ?? m.to,
      type: m.type || "appendEntries",
    })),
    committed: (raw.committed || []).filter(e => e?.command !== "init"),
    alert: lastResetReason || null,
  };
};

/* =========================
   Init runtime from current static frame
   ========================= */
const initRuntimeFromStatic = () => {
  const frame = getRawStepData(currentStep) || getRawStepData(0);
  runtime = {};
  (frame.nodes || []).forEach((n) => {
    runtime[n.id] = {
      role: ((n.role ?? n.state) || "follower").toLowerCase(),
      term: n.term || 1,
      votedFor: null,
      log: Array.isArray(n.log) ? n.log.slice() : [],
      commitIndex: 0,
      lastApplied: 0,
      nextIndex: {},
      matchIndex: {},
      heartbeatDueMs: Number.POSITIVE_INFINITY,
      electionDeadlineMs: nextElectionDeadline(),
      lossPct: 0,       
      _lossTerm: null,  
    };
  });

  const lid = ids().find((id) => runtime[id]?.role === "leader");
  if (lid) {
    runtime[lid].heartbeatDueMs = now() + Math.min(400, HEARTBEAT_MS);
    updateDropRateForTerm(runtime[lid].term || 1);
  }  
  lastMessages = [];
  inflight = [];
  electionCandidates = [];
  voteTally = {};
  prevLeaderSnapshot = null;
  committedLogs = (frame.committed || []).filter(e => e?.command !== "init").map(e => ({ term: e.term, command: e.command }));
};

/* =========================
   Replication / Leader helpers
   ========================= */
const initLeaderReplication = (leaderId) => {
  const lr = runtime[leaderId];
  lr.nextIndex = {};
  lr.matchIndex = {};
  ids().forEach((pid) => {
    if (pid === leaderId) return;
    lr.nextIndex[pid] = lr.log.length;
    lr.matchIndex[pid] = -1;
  });
};

const becomeLeader = (id) => {
  ids().forEach((pid) => {
    const r = runtime[pid];
    if (!r) return;
    if (pid === id) {
      r.role = "leader";
      r.votedFor = null;
      r.heartbeatDueMs = now() + Math.min(400, HEARTBEAT_MS); // quick first beat
    } else {
      if (!crashedNodes.has(pid)) r.role = "follower";
      r.votedFor = null;
      r.electionDeadlineMs = nextElectionDeadline();
      r.heartbeatDueMs = Number.POSITIVE_INFINITY;
    }
  });

  const term = runtime[id]?.term ?? 0;
  updateDropRateForTerm(term);
  try { METRICS.recordLeaderElected(id, term); } catch {}

  firstHBSentForTerm.delete(term);

  initLeaderReplication(id);
};

const sendHeartbeats = (leaderId) => {
  const lr = runtime[leaderId];
  if (!lr) return;

  lr.heartbeatDueMs = now() + HEARTBEAT_MS;

  const term = lr.term ?? 0;
  if (!firstHBSentForTerm.has(term)) {
    firstHBSentForTerm.add(term);
    try { METRICS.recordFirstHeartbeat(leaderId); } catch {}
  }

  ids().forEach((fid) => {
    if (fid === leaderId) return;
    // if (crashedNodes.has(fid)) return;

    const fr = runtime[fid];
    const nextIndex = fr ? fr.log.length : 0;

    let oneEntry = null;
    if (fr && nextIndex < committedLogs.length) {
      oneEntry = committedLogs[nextIndex];               // replicate committed first
    } else if (fr && nextIndex < lr.log.length) {
      oneEntry = lr.log[nextIndex];                      // then uncommitted, one by one
    }

    scheduleBall({
      type: "appendEntries",
      fromId: leaderId,
      toId: fid,
      payload: { term: lr.term, entries: oneEntry ? [oneEntry] : [] },
      travelMs: BALL_TRAVEL_MS,
      onDeliver: ({ payload }) => {
        if (crashedNodes.has(fid)) return;

        // demote & sync term up; refresh timer
        if ((payload.term || 0) >= (fr.term || 0)) {
          fr.role = "follower";
          fr.term = Math.max(fr.term || 0, payload.term || 0);
          fr.electionDeadlineMs = nextElectionDeadline();
        }

        if (Array.isArray(payload.entries) && payload.entries.length === 1) {
          // append exactly one entry
          const e = payload.entries[0];
          if (fr.log.length === nextIndex) {
            fr.log.push({ term: e.term, command: e.command });
          } else {
            fr.log[nextIndex] = { term: e.term, command: e.command };
            fr.log = fr.log.slice(0, nextIndex + 1);
          }
        }

        // ACK back with new matchIndex and re-check global commit
        const matchIndex = fr.log.length - 1;
        scheduleBall({
          type: "appendEntriesReply",
          fromId: fid,
          toId: leaderId,
          travelMs: ACK_TRAVEL_MS,
          payload: { matchIndex },
          onDeliver: ({ payload: ack }) => {
            if (crashedNodes.has(leaderId)) return;
            lr.matchIndex = lr.matchIndex || {};
            lr.nextIndex  = lr.nextIndex  || {};
            lr.matchIndex[fid] = ack.matchIndex;
            lr.nextIndex[fid]  = ack.matchIndex + 1;

            // Leader-side commit (classic Raft)
            updateCommitIndex(leaderId);
            // Global majority-based commit ledger
            recomputeCommittedFromMajority();
          }
        });
      }
    });
  });
};

const updateCommitIndex = (leaderId) => {
  const lr = runtime[leaderId];
  if (!lr || !lr.matchIndex) return;

  for (let N = lr.log.length - 1; N > lr.commitIndex; N--) {
    const replicatedAlive = 1 + aliveIds().filter((pid) => {
      if (pid === leaderId) return false;
      const mi = lr.matchIndex?.[pid] ?? -1;
      return mi >= N;
    }).length;

    if (replicatedAlive >= majorityAlive() && lr.log[N]?.term === lr.term) {
      lr.commitIndex = N;
      break;
    }
  }
  applyCommitted();
};

const applyCommitted = () => {
  ids().forEach((id) => {
    const r = runtime[id];
    if (!r) return;
    while (r.lastApplied < r.commitIndex) {
      r.lastApplied++;
    }
  });
};

const recomputeCommittedFromMajority = () => {
  let idx = committedLogs.length;

  while (true) {
    const tally = new Map();
    for (const id of aliveIds()) {
      const r = runtime[id]; if (!r) continue;
      const e = r.log[idx];
      if (!e) continue;
      const key = entryKey(e);
      const slot = tally.get(key);
      if (slot) slot.count += 1;
      else tally.set(key, { entry: e, count: 1 });
    }

    if (tally.size === 0) break;

    let best = null;
    for (const v of tally.values()) {
      if (!best || v.count > best.count) best = v;
    }

    if (!best || best.count < majorityAlive()) break;

    if (!entriesEqual(committedLogs[idx], best.entry)) {
      committedLogs[idx] = { term: best.entry.term, command: best.entry.command };
    }

    if (!committedIndexEmitted.has(idx)) {
      const key = entryKey(best.entry);
      const eid = ensureEntryIdForKey(key);               
      const term = best.entry.term || 0;
      try { METRICS.recordCommit(eid, term, globalDropRate); } catch {}
      committedIndexEmitted.add(idx);
    }

    idx += 1;
  }
};

/* =========================
   Election helpers (asynchronous RV)
   ========================= */
const eligibleForElection = (id) => {
  if (crashedNodes.has(id)) return false;
  const r = runtime[id]; if (!r) return false;
  if (!prevLeaderSnapshot) return true;

  const sameLen = (r.log?.length || 0) === (prevLeaderSnapshot.log?.length || 0);
  const sameEntries =
    sameLen && r.log.every((e, i) =>
      e.term === prevLeaderSnapshot.log[i].term &&
      e.command === prevLeaderSnapshot.log[i].command
    );

  const maxTerm = Math.max(...ids().filter(n => !crashedNodes.has(n)).map(n => runtime[n].term || 1));
  return sameEntries && (r.term || 1) >= maxTerm;
};

const pickCandidates = () => {
  const elig = ids().filter(eligibleForElection);
  for (let i = elig.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [elig[i], elig[j]] = [elig[j], elig[i]];
  }
  return elig.slice(0, 2); // up to two
};

const scheduleRequestVotes = (candidateId) => {
  const c = runtime[candidateId];
  if (!c) return;

  // promote this tick
  c.role = "candidate";
  c.term = (c.term || 0) + 1;
  updateDropRateForTerm(c.term);
  c.votedFor = candidateId;

  const cLastIdx  = c.log.length - 1;
  const cLastTerm = cLastIdx >= 0 ? (c.log[cLastIdx].term || 0) : 0;

  // self vote
  voteTally[candidateId] = (voteTally[candidateId] || 0) + 1;

  ids().forEach((pid) => {
    if (pid === candidateId) return;
    if (!reachable(candidateId, pid)) return;
    if (crashedNodes.has(pid)) return;

    const pr = runtime[pid];

    scheduleBall({
      type: "requestVote",
      fromId: candidateId,
      toId: pid,
      travelMs: BALL_TRAVEL_MS,
      payload: {
        term: c.term,
        candidateId,
        lastLogIndex: cLastIdx,
        lastLogTerm:  cLastTerm,
      },
      onDeliver: ({ payload }) => {
        if (crashedNodes.has(pid)) return;

        // bump term & demote if candidate has strictly higher term (Raft §5.1)
        if ((pr.term || 0) < payload.term) {
          pr.term = payload.term;
          if (pr.role === "leader") {
            pr.role = "follower";
            pr.heartbeatDueMs = Number.POSITIVE_INFINITY;
          }
          pr.votedFor = null;
        }

        // up-to-date check
        const candidateHasPrefix = hasCommittedPrefix(runtime[payload.candidateId]);
        const fLastIdx  = pr.log.length - 1;
        const fLastTerm = fLastIdx >= 0 ? (pr.log[fLastIdx].term || 0) : 0;
        const candidateUpToDate =
          candidateHasPrefix &&
          ((payload.lastLogTerm > fLastTerm) ||
          (payload.lastLogTerm === fLastTerm && payload.lastLogIndex >= fLastIdx));

        const canGrant = (pr.votedFor === null || pr.votedFor === payload.candidateId);

        if (candidateUpToDate && canGrant) {
          pr.votedFor = payload.candidateId;
          pr.electionDeadlineMs = nextElectionDeadline();
          scheduleBall({
            type: "voteGiven",
            fromId: pid,
            toId: payload.candidateId,
            travelMs: ACK_TRAVEL_MS,
            payload: { granted: true },
            onDeliver: ({ toId }) => {
              voteTally[toId] = (voteTally[toId] || 0) + 1;
              if (voteTally[toId] >= majorityAlive()) {
                becomeLeader(toId);
                scheduleBall({ type: "elected", fromId: toId, toId, travelMs: 200 });
                mode = MODE_DYNAMIC;           // return to steady state
                electionCandidates = [];
                voteTally = {};
              }
            }
          });
        }
      }
    });
  });
};

const runElectionStep = () => {
  // first election step: pick & schedule RVs
  if (electionCandidates.length === 0) {
    // Snapshot previous leader once
    if (!prevLeaderSnapshot) {
      const prevId = getLeaderId();
      if (prevId) {
        prevLeaderSnapshot = {
          id: prevId,
          term: runtime[prevId].term || 1,
          log: (runtime[prevId].log || []).slice(),
        };
      }
    }
    electionCandidates = pickCandidates();
    voteTally = {};
    electionCandidates.forEach(cid => scheduleRequestVotes(cid));
  }
};

/* =========================
   Main stepper
   ========================= */
export const setStep = (stepIndex) => { currentStep = stepIndex; };
export const getCurrentStep = () => currentStep;
export const getTotalSteps = () => (steps?.length || 0);

export const advanceStep = () => {
  if (mode === MODE_STATIC) {
    // static movie
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      isRunning = false; // end of movie
      lastResetReason = "Static demo finished. Press Reset to replay, or inject a fault to enter live mode.";
    }
    return getFilteredState(currentStep);
  }

  // deliver any messages that arrived since last tick
  deliverDueMessages();
  recomputeCommittedFromMajority();
  // After delivering RVs/ACKs, if no leader exists → enter election mode.
  if (mode === MODE_DYNAMIC && !getLeaderId()) {
    const alive = aliveIds().length;
    if (alive < 3) {
      lastResetReason = "Cluster has fewer than 3 alive nodes. Auto-resetting.";
      resetToInitialState();
      const s = getFilteredState(currentStep);
      s.alert = lastResetReason;
      return s;
    }

    // electionCandidates = [];
    // voteTally = {};
    mode = MODE_ELECTION;
  }

  if (mode === MODE_ELECTION) {
    // run scheduling on first step only; afterwards, just tally
    runElectionStep();

    // check majority after deliveries
    const winnerEntry = Object.entries(voteTally).find(([, count]) => count >= majorityAlive());
    if (winnerEntry) {
      const winner = Number(winnerEntry[0]);
      becomeLeader(winner);
      // celebrate + quick beat
      scheduleBall({ type: "elected", fromId: winner, toId: winner, travelMs: 200 });
      const lr = runtime[winner];
      if (lr) lr.heartbeatDueMs = Math.min(lr.heartbeatDueMs || Infinity, now() + 200);
      mode = MODE_DYNAMIC;
      electionCandidates = [];
      voteTally = {};
    }
  } else {
    // MODE_DYNAMIC: normal live operation (no leader change here)
    // forced timeouts are visual-only
    forceTimeoutNodes.forEach((nid) => {
      const r = runtime?.[nid];
      if (r && !crashedNodes.has(nid)) {
        r.role = "candidate";
        r.term = (r.term || 0) + 1;
        r.votedFor = nid;
        r.electionDeadlineMs = nextElectionDeadline();
        // visual pulse to self
        scheduleBall({ type: "becameCandidate", fromId: nid, toId: nid, travelMs: 200 });
      }
    });
    forceTimeoutNodes.clear();

    // Heartbeats when due → schedule AE balls
    const leaderId = getLeaderId();
    if (leaderId && now() >= (runtime[leaderId].heartbeatDueMs || 0)) {
      sendHeartbeats(leaderId);
    }
  }

  currentStep++;
  return getFilteredState(currentStep);
};

/* =========================
   Controls
   ========================= */
export const resetToInitialState = () => {
  currentStep = 0;
  isRunning = false;
  mode = MODE_STATIC;
  crashedNodes.clear();
  forceTimeoutNodes.clear();
  prevLeaderSnapshot = null;
  runtime = null;
  lastMessages = [];
  inflight = [];
  electionCandidates = [];
  voteTally = {};
  committedLogs = [];
  lastResetReason = null;
};

export const startSimulation = () => { isRunning = true; };
export const pauseSimulation = () => { isRunning = false; };

const ensureDynamic = () => {
  if (mode === MODE_STATIC) {
    initRuntimeFromStatic();
    mode = MODE_DYNAMIC;
  }
};

/* =========================
   Fault injection + client actions
   ========================= */
export const crashNode = async (nodeId) => {
  ensureDynamic();

  const wasLeader = !!runtime?.[nodeId] && runtime[nodeId].role === "leader";
  if (wasLeader) {
    runtime[nodeId].role = "follower";
    runtime[nodeId].heartbeatDueMs = Number.POSITIVE_INFINITY;
  }

  crashedNodes.add(nodeId);

  if (wasLeader) {
    await METRICS.recordLeaderCrash(nodeId);
    // snapshot the old leader for eligibility checks
    prevLeaderSnapshot = {
      id: nodeId,
      term: runtime[nodeId].term || 1,
      log: (runtime[nodeId].log || []).slice(),
    };
    // clear any in-flight and kick into election mode
    inflight = inflight.filter(m => !(m.fromId === nodeId || m.toId === nodeId));
    electionCandidates = [];
    voteTally = {};
    mode = MODE_ELECTION;
  }
};

export const recoverNode = (nodeId) => {
  crashedNodes.delete(nodeId);

  if (!runtime) return;
  if (!runtime[nodeId]) {
    runtime[nodeId] = {
      role: "follower",
      term: 1,
      votedFor: null,
      log: [],
      commitIndex: 0,
      lastApplied: 0,
      heartbeatDueMs: Number.POSITIVE_INFINITY,
      electionDeadlineMs: nextElectionDeadline(),
    };
  }

  const r = runtime[nodeId];
  r.role = "follower";
  r.votedFor = null;
  r.heartbeatDueMs = Number.POSITIVE_INFINITY;
  r.electionDeadlineMs = nextElectionDeadline();

  const leaderId = getLeaderId();
  if (leaderId) {
    const lr = runtime[leaderId];
    const newTerm = Math.max(r.term || 0, lr.term || 0);
    if (newTerm !== r.term) {
      r.term = newTerm;
    }
  }
};

export const forceTimeout = async (nodeId) => {
  ensureDynamic();

  await METRICS.recordElectionStart();
  if (!runtime) return;
  if (crashedNodes.has(nodeId)) return;

  const r = runtime[nodeId];
  if (!r) return;

  // Only followers can be forced to timeout
  if (r.role !== "follower") return;

  // Align to (at least) current leader term but DO NOT increment here.
  const currentLeader = getLeaderId();
  const leaderTerm = currentLeader ? (runtime[currentLeader].term || 0) : (r.term || 0);
  r.term = Math.max(r.term || 0, leaderTerm);
  updateDropRateForTerm(r.term);   

  r.role = "candidate";
  r.votedFor = nodeId;
  r.electionDeadlineMs = nextElectionDeadline();

  // Start RV campaign immediately (this will do the single +1)
  electionCandidates = [nodeId];
  voteTally = {};
  scheduleRequestVotes(nodeId);

  // Stay in MODE_DYNAMIC; leader will demote upon receiving higher-term RV.
};

export const clientCommand = (command, nodeId) => {
  ensureDynamic();
  if (!runtime) return;

  const leaderId = nodeId ?? getLeaderId();
  if (!leaderId) throw new Error("No leader to accept client command");
  if (crashedNodes.has(leaderId)) throw new Error("Leader unavailable");

  const lr = runtime[leaderId];
  const cmd = String(command || "").trim();
  if (!cmd) return;

  // creating entry with a stable id so commit can match it later
  const entry = { term: lr.term || 1, command: cmd };
  const key   = entryKey(entry);               
  const id    = ensureEntryIdForKey(key);      

  lr.log = (lr.log || []).concat([{ ...entry, id }]);

  try { METRICS.recordStartCommand(id, lr.term || 1, globalDropRate); } catch {}

  // quick send to replicate
  lr.heartbeatDueMs = Math.min(lr.heartbeatDueMs || Infinity, now() + 120);

  recomputeCommittedFromMajority();
};

export const dropLatestLog = (nodeId) => {
  ensureDynamic();
  const r = runtime?.[nodeId];
  if (!r || crashedNodes.has(nodeId)) return;
  if (Array.isArray(r.log) && r.log.length > 0) {
    r.log = r.log.slice(0, r.log.length - 1);
  }
};

/* =========================
   Public API (for backend.js)
   ========================= */
export const raftCluster = {
  getFilteredState,
  getRawStepData,
  advanceStep,
  setStep,
  getCurrentStep: () => currentStep,
  getTotalSteps: () => (steps?.length || 0),
  resetToInitialState,
  startSimulation,
  pauseSimulation,
  isRunning: () => isRunning,
  isDynamic: () => mode !== MODE_STATIC,
  crashNode,
  recoverNode,
  forceTimeout,
  clientCommand,
  dropLatestLog,
};