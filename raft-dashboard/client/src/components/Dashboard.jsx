import React from "react";
import Node from "./Node";
import ControlPanel from "./ControlPanel";

const nodes = [
  {
    id: 1,
    state: "follower",
    term: 1,
    position: { top: 20, left: 50 },
  },
  {
    id: 2,
    state: "follower",
    term: 1,
    position: { top: 40, left: 85 },
  },
  {
    id: 3,
    state: "follower",
    term: 1,
    position: { top: 70, left: 70 },
  },
  {
    id: 4,
    state: "follower",
    term: 1,
    position: { top: 70, left: 30 },
  },
  {
    id: 5,
    state: "follower",
    term: 1,
    position: { top: 40, left: 15 },
  },
];

const Dashboard = () => {
  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <h1 className="text-4xl text-white font-bold text-center pt-6 pb-4">
        Raft Consensus Dashboard
      </h1>

      <ControlPanel />

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </div>
  );
};

export default Dashboard;
