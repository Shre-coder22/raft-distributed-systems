import { steps } from "./steps.js";
import { nodePositions } from "./positions.js";

let currentStep = 0;
let isRunning = false;
let isDynamic = false; 
let crashedNodes = new Set();
let partitionedNodes = new Set();
let dropProbabilities = {};
let forceTimeoutNodes = new Set();

const getRawStepData = (stepIndex) => {
  return steps[stepIndex] || steps[steps.length - 1];
};

const getFilteredState = (stepIndex = currentStep) => {
  const raw = getRawStepData(stepIndex);

  return {
    step: stepIndex,
    nodes: raw.nodes.map((n, i) => {
      const crashed = crashedNodes.has(n.id);
      const partitioned = partitionedNodes.has(n.id);

      // normalize role + status
      const role = (n.role ?? n.state ?? "").toLowerCase(); 
      const status = crashed ? "crashed" : (partitioned ? "partitioned" : "healthy");

      return {
        ...n,
        role,                           
        state: n.state ?? n.role ?? "", 
        status,                         
        position: nodePositions[i] || { left: 50, top: 50 },
        log: n.log || [],               
      };
    }),
    messages: (raw.messages || []).filter((m) => {
      // enforce fromId/toId naming for filters
      const from = m.fromId ?? m.from;
      const to   = m.toId   ?? m.to;
      return (
        from != null && to != null &&
        !crashedNodes.has(from) &&
        !crashedNodes.has(to) &&
        !partitionedNodes.has(from) &&
        !partitionedNodes.has(to) &&
        (Math.random() >= (dropProbabilities[from] || 0))
      );
    }).map((m) => ({
      fromId: m.fromId ?? m.from,
      toId:   m.toId   ?? m.to,
      type:   m.type || "appendEntries",
    })),
  };
};

const advanceStep = () => {
  if (!isDynamic) {
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      // reached the end of the static movie -> pause
      isRunning = false;
      return getFilteredState(currentStep);
    }
  } else {
    currentStep++; 
  }

  // forced timeouts
  const raw = getRawStepData(currentStep);
  raw.nodes.forEach((n) => {
    if (forceTimeoutNodes.has(n.id) && !crashedNodes.has(n.id)) {
      n.state = "candidate";
      n.term = (n.term || 0) + 1;
    }
  });
  forceTimeoutNodes.clear();

  return getFilteredState(currentStep);
};

const setStep = (stepIndex) => {
  currentStep = stepIndex;
};

const getCurrentStep = () => currentStep;
const getTotalSteps = () => (steps?.length || 0);

const goDynamic = () => {
  isDynamic = true;
};

const now = () => Date.now();
const getLeaderId = () => ids().find(id => runtime?.[id]?.role === "leader" && !crashedNodes.has(id));

const resetToInitialState = () => {
  console.log("[Cluster] Resetting simulation to step 0");
  currentStep = 0;
  isRunning = false;
  isDynamic = false;
  crashedNodes.clear();
  partitionedNodes.clear();
  dropProbabilities = {};
  forceTimeoutNodes.clear();
};

const startSimulation = () => {
  console.log("[Cluster] Simulation started"); // startSimulation
  isRunning = true;
};

const pauseSimulation = () => {
  console.log("[Cluster] Simulation paused"); // pauseSimulation
  isRunning = false;
};

const crashNode = (nodeId) => {
  goDynamic();
  crashedNodes.add(nodeId);
  console.log("[Cluster] crashNode", nodeId, "→ crashedNodes:", [...crashedNodes]);

  if (!runtime) return;
  const r = runtime[nodeId];
  if (r) {
    if (r.role === "leader") {
      r.heartbeatDueMs = Number.POSITIVE_INFINITY;
    }
    r.role = r.role === "leader" ? "follower" : r.role;
  }

  const leaderId = getLeaderId();
  const leaderCrashed = leaderId === undefined; // no healthy leader left

  if (leaderCrashed) {
    // accelerate elections on all healthy, non-partitioned followers
    ids().forEach(fid => {
      if (crashedNodes.has(fid) || partitionedNodes.has(fid)) return;
      const f = runtime[fid];
      if (!f) return;
      f.votedFor = null;
      f.electionDeadlineMs = now(); // triggers startElection on next tick
    });
  }
};

const recoverNode = (nodeId) => {
  crashedNodes.delete(nodeId);
  console.log("[Cluster] recoverNode", nodeId, "→ crashedNodes:", [...crashedNodes]);

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
      electionDeadlineMs: now() + randomElectionTimeout(),
    };
  }

  const r = runtime[nodeId];
  r.role = "follower";
  r.votedFor = null;
  r.heartbeatDueMs = Number.POSITIVE_INFINITY;     // follower doesn’t schedule heartbeats
  r.electionDeadlineMs = now() + randomElectionTimeout();

  const leaderId = getLeaderId();
  if (!leaderId) {
    r.electionDeadlineMs = now() + Math.min(800, randomElectionTimeout());
  } else {
    const lr = runtime[leaderId];
    if (lr && reachable(leaderId, nodeId)) {
      r.term = Math.max(r.term || 0, lr.term || 0);
    }
  }
};

const partitionNode = (nodeId) => {
  goDynamic();
  partitionedNodes.add(nodeId);
  console.log("[Cluster] partitionNode", nodeId, "→ partitionedNodes:", [...partitionedNodes]);

  if (!runtime) return;

  const leaderId = getLeaderId();
  const leaderIsolated = leaderId === nodeId;

  if (leaderIsolated) {
    ids().forEach(fid => {
      if (fid === nodeId) return;
      const r = runtime[fid];
      if (!r) return;
      if (!crashedNodes.has(fid) && !partitionedNodes.has(fid)) {
        r.votedFor = null;
        r.role = r.role === "leader" ? "follower" : r.role; 
        r.electionDeadlineMs = now(); // will startElection on next tick
      }
    });
  }
};

const healNode = (nodeId) => {
  partitionedNodes.delete(nodeId);
  console.log("[Cluster] healNode", nodeId, "→ partitionedNodes:", [...partitionedNodes]);

  if (!runtime) return;

  const r = runtime[nodeId];
  if (!r) return;

  const otherLeader = ids().find(id => id !== nodeId && runtime[id]?.role === "leader" && !crashedNodes.has(id));
  if (otherLeader) {
    r.role = "follower";
    r.votedFor = null;
  }
  r.electionDeadlineMs = now() + randomElectionTimeout();
};

// Default per-node message drop probability (0.1).
const setDropProbability = (nodeId, probability) => {
  goDynamic();
  console.log("[Cluster] setDropProbability", nodeId, "=", probability, "→ dropProbabilities:", { ...dropProbabilities });

  const p = Math.max(0, Math.min(1, Number(probability) || 0));
  dropProbabilities[nodeId] = p;
};

// Force a node's election timeout right now.
const forceTimeout = (nodeId) => {
  goDynamic();
  forceTimeoutNodes.add(nodeId);
  console.log("[Cluster] forceTimeout", nodeId, "→ forceTimeoutNodes:", [...forceTimeoutNodes]);

  if (!runtime) return;
  const r = runtime[nodeId];
  if (!r) return;

  r.votedFor = null;
  r.electionDeadlineMs = now(); // triggers election on next dynamic tick
};

export const raftCluster = {
  getFilteredState,
  getRawStepData,
  advanceStep,
  setStep,
  getCurrentStep,
  getTotalSteps,
  resetToInitialState,
  startSimulation,
  pauseSimulation,
  isRunning: () => isRunning,
  isDynamic: () => isDynamic,
  crashNode,
  recoverNode,
  partitionNode,
  healNode,
  setDropProbability,
  forceTimeout,
  goDynamic,
};