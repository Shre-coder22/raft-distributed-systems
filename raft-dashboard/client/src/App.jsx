import { useState } from "react";
import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import MessageLayer from "./components/MessageLayer";
import useRaftPolling from "./hooks/useRaftPolling";

const App = () => {
  const [isRunning, setIsRunning] = useState(true);
  const { nodes, messages, step, reset } = useRaftPolling(isRunning);

  const handlePlay = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    reset();           // ⬅️ reset state immediately
    setIsRunning(false); // ⏸️ optionally pause after reset
  };

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <h1 className="text-4xl text-white font-bold text-center pt-6">Raft Dashboard</h1>
      <ControlPanel onPlay={handlePlay} onPause={handlePause} onReset={handleReset} />
      <MessageLayer nodes={nodes} messages={messages} />
      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </div>
  );
};

export default App;
