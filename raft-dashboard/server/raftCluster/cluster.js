import { steps } from "./steps.js";
import { nodePositions } from "./positions.js"; // ✅ import positions

let currentStep = 0;
let isRunning = false;
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
    nodes: raw.nodes.map((n, i) => ({
      ...n,
      state: crashedNodes.has(n.id) ? "Crashed" : n.state,
      position: nodePositions[i] || { left: 50, top: 50 }, // ✅ attach position
    })),
    messages: raw.messages.filter(
      (m) =>
        !crashedNodes.has(m.from) &&
        !crashedNodes.has(m.to) &&
        !partitionedNodes.has(m.from) &&
        !partitionedNodes.has(m.to) &&
        (Math.random() >= (dropProbabilities[m.from] || 0))
    ),
  };
};

const advanceStep = () => {
  currentStep++;

  // Force timeout nodes become candidates
  const raw = getRawStepData(currentStep);
  raw.nodes.forEach((n) => {
    if (forceTimeoutNodes.has(n.id) && !crashedNodes.has(n.id)) {
      n.state = "Candidate";
      n.term = (n.term || 0) + 1; // bump term if needed
    }
  });
  forceTimeoutNodes.clear();

  return getFilteredState(currentStep);
};

const setStep = (stepIndex) => {
  currentStep = stepIndex;
};

const resetToInitialState = () => {
  currentStep = 0;
  isRunning = false;
  crashedNodes.clear();
  partitionedNodes.clear();
  dropProbabilities = {};
  forceTimeoutNodes.clear();
};

const startSimulation = () => {
  isRunning = true;
};

const pauseSimulation = () => {
  isRunning = false;
};

const crashNode = (nodeId) => {
  crashedNodes.add(nodeId);
};

const recoverNode = (nodeId) => {
  crashedNodes.delete(nodeId);
};

const partitionNode = (nodeId) => {
  partitionedNodes.add(nodeId);
};

const healNode = (nodeId) => {
  partitionedNodes.delete(nodeId);
};

const setDropProbability = (nodeId, probability) => {
  dropProbabilities[nodeId] = probability;
};

const forceTimeout = (nodeId) => {
  forceTimeoutNodes.add(nodeId);
};

export const raftCluster = {
  getFilteredState,
  getRawStepData,
  advanceStep,
  setStep,
  resetToInitialState,
  startSimulation,
  pauseSimulation,
  isRunning: () => isRunning,
  crashNode,
  recoverNode,
  partitionNode,
  healNode,
  setDropProbability,
  forceTimeout,
};