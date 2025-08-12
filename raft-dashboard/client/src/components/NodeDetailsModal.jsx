import { useEffect } from "react";

const NodeDetailsModal = ({ isOpen, onClose, nodeData }) => {

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!node) return null;

  if (!isOpen || !nodeData) return null;

   const statusColor = {
    healthy: "bg-green-500",
    crashed: "bg-red-500",
    partitioned: "bg-yellow-500",
  }[node.status || "healthy"];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✖
        </button>

        {/* Node Info */}
        <h2 className="text-2xl font-bold mb-4">Node {node.id}</h2>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 text-white rounded ${statusColor}`}>
            {node.status || "healthy"}
          </span>
          <span className="px-2 py-1 bg-blue-500 text-white rounded">
            {node.role}
          </span>
        </div>
        <p className="text-gray-600 mb-1">Term: {node.term}</p>
        <p className="text-gray-600 mb-4">Log Entries: {JSON.stringify(node.logs)}</p>

        {/* Fault Injection Controls */}
        <div className="space-y-2">
          <button
            className="w-full bg-red-500 hover:bg-red-200 text-white py-1 px-3 rounded"
            onClick={() => sendCommand(`/nodes/${node.id}/crash`)}
          >
            Crash Node
          </button>
          <button
            className="w-full bg-green-500 hover:bg-green-300 text-white py-1 px-3 rounded"
            onClick={() => sendCommand(`/nodes/${node.id}/recover`)}
          >
            Recover Node
          </button>
          <button
            className="w-full bg-yellow-500 hover:bg-yellow-200 text-white py-1 px-3 rounded"
            onClick={() => sendCommand(`/nodes/${node.id}/partition`)}
          >
            Partition Node
          </button>
          <button
            className="w-full bg-blue-500 hover:bg-blue-300 text-white py-1 px-3 rounded"
            onClick={() => sendCommand(`/nodes/${node.id}/heal`)}
          >
            Heal Network
          </button>
          <button
            className="w-full bg-purple-500 hover:bg-purple-300 text-white py-1 px-3 rounded"
            onClick={() => sendCommand(`/nodes/${node.id}/force-timeout`)}
          >
            Force Timeout
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodeDetailsModal