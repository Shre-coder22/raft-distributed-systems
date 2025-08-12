import { useState } from "react";
import useRaftSocket from "./hooks/useRaftSocket";
import useStepHistory from "./hooks/useStepHistory";
import StepSlider from "./components/StepSlider";
import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import MessageLayer from "./components/MessageLayer";
import NodeDetailsModal from "./components/NodeDetailsModal";

const App = () => {
  const [isRunning, setIsRunning] = useState(true);
  const { connected, state, send } = useRaftSocket(isRunning);
  const { nodes, messages, step } = state; // make sure isRunning is in state
  const [selectedNode, setSelectedNode] = useState(null);

  // Example handlers (will be wired in Step 2)
  const crashNode = (id) => console.log("Crash node", id);
  const recoverNode = (id) => console.log("Recover node", id);
  const partitionNode = (id) => console.log("Partition node", id);
  const healNode = (id) => console.log("Heal node", id);
  const forceTimeout = (id) => console.log("Force timeout", id);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const {
    history,
    selectedStep,
    setSelectedStep,
    getNodesForStep,
    totalSteps,
    resetHistory,
  } = useStepHistory(nodes, step);

   const handlePlay = () => {
    setIsRunning(true);
    setSelectedStep(Math.max(0, totalSteps - 1)); 
  }
  const handlePause = () => setIsRunning(false);

  const handleReset = async () => {
    setIsRunning(false); 
    try {
      await fetch("http://localhost:4000/raft/reset", { method: "POST" });
      resetHistory(); 
    } catch (err) {
      console.error("Reset failed", err);
    }
  };
  const handleAdvance = () => send("advance_step");

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden flex flex-col">
      {/* Playback controls */}
      <ControlPanel
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        onStepForward={handleAdvance}
      />

      {/* Step slider */}
      <StepSlider
        currentStep={selectedStep}
        maxStep={Math.max(0, totalSteps - 1)}
        onChange={(v) => setSelectedStep(v)}
        isRunning={isRunning}
      />

      {/* Main simulation area */}
      <div className="flex-1 relative">
        <MessageLayer
          nodes={getNodesForStep(selectedStep)}
          messages={isRunning ? messages : []}
        />
        {getNodesForStep(selectedStep).map((node) => (
          <Node key={node.id} node={node} onClick={handleNodeClick} />
        ))}
      </div>

      {/* Modal */}
      {selectedNode && (
        <NodeDetailsModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onCrash={crashNode}
          onRecover={recoverNode}
          onPartition={partitionNode}
          onHeal={healNode}
          onForceTimeout={forceTimeout}
        />
      )}
    </div>
  );
};

export default App;
