import { useState, useMemo, useEffect } from "react";
import useRaftSocket from "./hooks/useRaftSocket";
import useStepHistory from "./hooks/useStepHistory";
import StepSlider from "./components/StepSlider";
import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import HeartbeatBallsLayer from "./components/HeartbeatBallsLayer";
import NodeDetailsModal from "./components/NodeDetailsModal";
import ElectionCelebration from "./components/ElectionCelebration";
import Legend from "./components/Legend";
import CommittedBar from "./components/CommittedBar";

const App = () => {
  const [isRunning, setIsRunning] = useState(true);
  const { connected, state, send } = useRaftSocket(isRunning);

  // Drive UI mode from backend (static | dynamic | election)
  const backendMode = state.mode || "static";
  const isDynamic = backendMode !== "static";

  // keep history only for static movie
  const {
    history,
    selectedStep,
    setSelectedStep,
    getNodesForStep,
    totalSteps,
    resetHistory,
  } = useStepHistory(state.nodes || [], state.step || 0, isDynamic);

  const messagesToRender = state.messages || [];
  const isAtLatest = selectedStep === Math.max(0, totalSteps - 1);

  const nodesToRender = useMemo(() => {
    return backendMode === "static"
      ? getNodesForStep(selectedStep)
      : (state.nodes || []);
  }, [backendMode, getNodesForStep, selectedStep, state.nodes]);

  const [selectedNode, setSelectedNode] = useState(null);
  useEffect(() => {
    if (!selectedNode) return;
    const updated = (state.nodes || []).find(n => n.id === selectedNode.id);
    if (updated) setSelectedNode(updated);
  }, [state.nodes, selectedNode?.id]);

  useEffect(() => {
    if (state.alert) {
      alert(state.alert);
      send("reset");
    }
  }, [state.alert]);

  const goDynamic = () => {
    // backend decides mode; here just ensure ticking
    setIsRunning(true);
    send("start");
  };

  // Fault buttons -> send WS and ensure ticking
  const crashNode = (id) => {
    send("crash_node", { nodeId: id });
    goDynamic();
  };
  const recoverNode = (id) => {
    send("recover_node", { nodeId: id });
    goDynamic();
  };
  const forceTimeout = (id) => {
    send("force_timeout", { nodeId: id });
    goDynamic();
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setIsRunning(false);
    send("pause");
  }; 

  const closeModal = () => {
    setSelectedNode(null);
    setIsRunning(true);
    send("start");
  };

  // Controls
  const handlePlay = () => {
    setIsRunning(true);
    send("start");
    send("get_state");
  };

  const handlePause = () => {
    setIsRunning(false);
    send("pause");
  };

  const handleReset = () => {
    setIsRunning(false);
    resetHistory();          
    send("reset");            
    send("get_state");
  };

  const handleAdvance = () => {
    if (backendMode === "static") send("advance_step");
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

      {/* Step slider (disabled during dynamic/election) */}
      <StepSlider
        currentStep={selectedStep}
        maxStep={Math.max(0, totalSteps - 1)}
        onChange={(v) => { if (backendMode === "static") setSelectedStep(v); }}
        isRunning={isRunning}
        disabled={backendMode !== "static"}
      />

      {/* Committed logs ribbon */}
      <CommittedBar committed={(state.committed) || []} />

      {/* Main simulation area */}
      <div className="flex-1 relative">
        {/* Always feed backend messages so election balls show up */}
        <HeartbeatBallsLayer
          nodes={getNodesForStep(selectedStep)}
          messages={messagesToRender}
          paused={!isRunning}
        />

        <ElectionCelebration
          nodes={nodesToRender}
          messages={messagesToRender}
        />

        {nodesToRender.map((node) => (
          <Node key={node.id} node={node} onClick={handleNodeClick} />
        ))}
        <Legend />
      </div>

      {/* Modal */}
      {selectedNode && (
        <NodeDetailsModal
          nodeData={selectedNode}
          onClose={closeModal}
          onCrash={crashNode}
          onRecover={recoverNode}
          onForceTimeout={forceTimeout}
          send={send}
          dropRate={state.dropRate}
        />
      )}
    </div>
  );
};

export default App;