// raftCluster/cluster.js
import { steps } from "./steps.js";
import { nodePositions } from "./positions.js";

let currentStep = 0;
let simulationRunning = false;

// Fault/control state
const crashedNodes = new Set();
const partitionedNodes = new Set();
let dropRate = 0; // 0..1

function initClusterState() {
  currentStep = 0;
  crashedNodes.clear();
  partitionedNodes.clear();
  dropRate = 0;
}

function getRawStepData(stepIndex = currentStep) {
  const stepData = steps[stepIndex % steps.length];
  const nodesWithPos = stepData.nodes.map((n, i) => ({
    ...n,
    position: nodePositions[i],
  }));

  return {
    step: stepIndex,
    nodes: nodesWithPos,
    messages: stepData.messages || [],
  };
}

// Filter messages according to crash/partition/drop settings
function getFilteredState(stepIndex = currentStep) {
  const raw = getRawStepData(stepIndex);
  const filteredMessages = raw.messages.filter((m) => {
    // drop if either endpoint is crashed
    if (crashedNodes.has(m.fromId) || crashedNodes.has(m.toId)) return false;
    // drop if either endpoint is partitioned (simple model)
    if (partitionedNodes.has(m.fromId) || partitionedNodes.has(m.toId)) return false;
    // random drop
    if (Math.random() < dropRate) return false;
    return true;
  });

  return {
    step: raw.step,
    nodes: raw.nodes.map((n) => ({
      ...n,
      // augment node with flags for frontend rendering
      crashed: crashedNodes.has(n.id),
      partitioned: partitionedNodes.has(n.id),
    })),
    messages: filteredMessages,
  };
}

function advanceStep() {
  currentStep++;
  return getFilteredState();
}

function setStep(index) {
  currentStep = index;
  return getFilteredState();
}

function resetToInitialState() {
  initClusterState();
}

function startSimulation() {
  simulationRunning = true;
}

function pauseSimulation() {
  simulationRunning = false;
}

function isRunning() {
  return simulationRunning;
}

// Fault APIs
function crashNode(nodeId) {
  crashedNodes.add(nodeId);
}
function recoverNode(nodeId) {
  crashedNodes.delete(nodeId);
}
function partitionNode(nodeId) {
  partitionedNodes.add(nodeId);
}
function healNode(nodeId) {
  partitionedNodes.delete(nodeId);
}
function setDropProbability(p) {
  dropRate = Math.max(0, Math.min(1, Number(p) || 0));
}

// Export the API the backend will call
export const raftCluster = {
  getFilteredState,
  getRawStepData,
  advanceStep,
  setStep,
  resetToInitialState,
  startSimulation,
  pauseSimulation,
  isRunning,
  crashNode,
  recoverNode,
  partitionNode,
  healNode,
  setDropProbability,
};