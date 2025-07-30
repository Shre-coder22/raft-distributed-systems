import { steps } from "./steps.js";
import { nodePositions } from "./positions.js";

let currentStep = 0;

function getClusterState() {
  const stepData = steps[currentStep % steps.length];

  const nodesWithPos = stepData.nodes.map((n, i) => ({
    ...n,
    position: nodePositions[i],
  }));

  return {
    step: currentStep,
    nodes: nodesWithPos,
    messages: stepData.messages,
  };
}

function advanceStep() {
  currentStep++;
}

function resetToInitialState() {
  console.log("🔄 Resetting Raft cluster to step 0 (term 1, all followers)");
  currentStep = 0;
}

export const raftCluster = {
  getClusterState,
  advanceStep,
  resetToInitialState,
};