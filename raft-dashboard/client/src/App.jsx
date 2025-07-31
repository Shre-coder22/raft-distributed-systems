import { useState } from "react";
import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import MessageLayer from "./components/MessageLayer";
import StepSlider from "./components/StepSlider";

import useRaftPolling from "./hooks/useRaftPolling";
import useStepHistory from "./hooks/useStepHistory";

const App = () => {
  const [isRunning, setIsRunning] = useState(true);

  // Live Raft state (polling every second when running)
  const { nodes, messages, step } = useRaftPolling(isRunning);

  const {
    history,
    selectedStep,
    setSelectedStep,
    getNodesForStep,
    totalSteps,
    resetHistory,
  } = useStepHistory(nodes, step);

  // Handlers for Control Panel
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

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <h1 className="text-4xl text-white font-bold text-center pt-6">
        Raft Dashboard
      </h1>

      {/* Controls: Play, Pause, Reset */}
      <ControlPanel
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
      />

      {/* Timeline Slider for step history playback */}
      <StepSlider
        currentStep={Math.max(0, selectedStep)}
        maxStep={Math.max(0, totalSteps - 1)}
        onChange={setSelectedStep}
        isRunning={isRunning}
      />

      {/* Static state view: messages omitted for timeline */}
      <MessageLayer
        nodes={getNodesForStep(selectedStep)}
        messages={[]}
      />

      {/* Render node UIs for the selected step */}
      {getNodesForStep(selectedStep).map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </div>
  );
};

export default App;