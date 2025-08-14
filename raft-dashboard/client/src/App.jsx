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
  const [isDynamic, setIsDynamic] = useState(false);
  const { connected, state, send } = useRaftSocket(isRunning);
  const { nodes, messages, step } = state;
  const [selectedNode, setSelectedNode] = useState(null);

  const sendCommand = async (endpoint) => {
    try {
      await fetch(`http://localhost:4000${endpoint}`, { method: "POST" });
    } catch (err) {
      console.error(`Command failed: ${endpoint}`, err);
    }
  };

  const goDynamic = () => {
    setIsDynamic(true);
    setIsRunning(true);   
    send("start"); 
  };

  const crashNode = (id) => {
    send("crash_node", { nodeId: id });
    goDynamic();
  };

  const recoverNode = (id) => {
    send("recover_node", { nodeId: id });
    goDynamic();
  };

  const partitionNode = (id) => {
    send("partition_node", { nodeId: id });
    goDynamic();
  };

  const healNode = (id) => {
    send("heal_node", { nodeId: id });
    goDynamic();
  };

  const forceTimeout = (id) => {
    send("force_timeout", { nodeId: id });
    goDynamic();
  };

  const setDropProbability = (id, probability01) => {
    send("set_drop_probability", { nodeId: id, probability: probability01 }); // 0..1
    setIsDynamic(true);
    setIsRunning(true);
  };

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
  } = useStepHistory(nodes, step, isDynamic);


  const handlePlay = () => {
    if (!isDynamic) {
      send("start"); // Tell backend to start advancing steps
    }
  };

  const handlePause = () => {
    if (!isDynamic) {
      send("pause"); // Tell backend to pause
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsDynamic(false);

    resetHistory();         
    setSelectedStep(0);

    send("reset");
  };

  const handleAdvance = () => {
    if (!isDynamic) {
      send("advance_step");
    }
  };

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
        onChange={(v) => {
          if (!isDynamic) setSelectedStep(v);
        }}
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
          nodeData={selectedNode}
          onClose={() => setSelectedNode(null)}
          onCrash={crashNode}
          onRecover={recoverNode}
          onPartition={partitionNode}
          onHeal={healNode}
          onForceTimeout={forceTimeout}
          onSetDropProbability={setDropProbability}
          isDynamic={isDynamic}
        />
      )}
    </div>
  );
};

export default App;