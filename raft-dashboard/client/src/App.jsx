import React from "react";
import Node from "./components/Node";
import ControlPanel from "./components/ControlPanel";
import initialNodes from "./data/initialNodes";

const App = () => {
  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <h1 className="text-4xl text-white font-bold text-center pt-6">Raft Dashboard</h1>
      <ControlPanel />
      {initialNodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </div>
  );
};

export default App;
