import { useEffect, useState } from "react";

const NodeDetailsModal = ({
  nodeData,
  onClose,
  onCrash,
  onRecover,
  onPartition,
  onHeal,
  onForceTimeout,
  onSetDropProbability,
  isDynamic,
}) => {
  const [lossPct, setLossPct] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!nodeData) return null;

  const applyDropProb = () => {
    const prob01 = Math.max(0, Math.min(1, lossPct / 100));
    onSetDropProbability?.(nodeData.id, prob01);
  };

  const statusColor = {
    healthy: "bg-green-500",
    crashed: "bg-red-500",
    partitioned: "bg-yellow-500",
  }[nodeData.role === "crashed" ? "crashed" : nodeData.status || "healthy"]

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold mb-4">Node {nodeData.id}</h2>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 text-white rounded ${statusColor}`}>
            {(nodeData.role === "crashed" || nodeData.status === "crashed") ? "crashed"
              : (nodeData.status === "partitioned") ? "partitioned"
              : "healthy"}
          </span>
          <span className="px-2 py-1 bg-blue-500 text-white rounded">
            {nodeData.role === "crashed" ? "" : nodeData.role}
          </span>
        </div>
        <p className="text-gray-600 mb-1">Term: {nodeData.term}</p>
        <p className="text-gray-600 mb-4">
          Log Entries: {(nodeData.log || []).map(e => e.command).join(", ")}
        </p>

        {/* Fault Injection Controls */}
        <div className="space-y-2">
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
            onClick={() => onCrash(nodeData.id)}
          >
            Crash Node
          </button>
          <button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded"
            onClick={() => onRecover(nodeData.id)}
          >
            Recover Node
          </button>
          <button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded"
            onClick={() => onPartition(nodeData.id)}
          >
            Partition Node
          </button>
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
            onClick={() => onHeal(nodeData.id)}
          >
            Heal Network
          </button>
          <button
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded"
            onClick={() => onForceTimeout(nodeData.id)}
          >
            Force Timeout
          </button>
        </div>

        {/* Per-node message loss slider */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Loss % (from Node {nodeData.id})
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={lossPct}
            onChange={(e) => setLossPct(Number(e.target.value))}
            onMouseUp={applyDropProb}
            onTouchEnd={applyDropProb}
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">{lossPct}%</div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsModal;