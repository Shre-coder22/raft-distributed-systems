import { useState } from "react";
import useRaftSocket from "./hooks/useRaftSocket";
import useStepHistory from "./hooks/useStepHistory";
import StepSlider from "./components/StepSlider";
import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import MessageLayer from "./components/MessageLayer";
import FaultPanel from "./components/FaultPanel"; // new import

const App = () => {
  const [isRunning, setIsRunning] = useState(true);
  const { connected, state, send } = useRaftSocket(isRunning);
  const { nodes, messages, step } = state; // make sure isRunning is in state

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

  const crashNode = (id) => send("crash_node", { nodeId: id });
  const recoverNode = (id) => send("recover_node", { nodeId: id });
  const partitionNode = (id) => send("partition_node", { nodeId: id });
  const healNode = (id) => send("heal_node", { nodeId: id });
  const setDrop = (p) => send("drop_messages", { probability: p });

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
        {getNodesForStep(selectedStep).map((n) => (
          <Node key={n.id} node={n} />
        ))}
      </div>

      {/* Fault injection panel */}
      <FaultPanel
        onPartition={() => partitionNode(prompt("Node ID to partition:"))}
        onDropMessages={() => setDrop(parseFloat(prompt("Drop probability (0-1):")))}
        onCrashNode={() => crashNode(prompt("Node ID to crash:"))}
        onRecoverNode={() => recoverNode(prompt("Node ID to recover:"))}
        onHealNode={() => healNode(prompt("Node ID to heal:"))}
      />
    </div>
  );
};

export default App;
