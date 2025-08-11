import { Network, Trash2, AlertTriangle, RefreshCw, Link } from "lucide-react";

const FaultPanel = ({ onPartition, onDropMessages, onCrashNode, onRecoverNode, onHealNode }) => {
  return (
    <div className="flex justify-center gap-6 my-4">
      <button
        onClick={onPartition}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
      >
        <Network size={18} /> Partition Network
      </button>
      <button
        onClick={onDropMessages}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow"
      >
        <Trash2 size={18} /> Drop Messages
      </button>
      <button
        onClick={onCrashNode}
        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow"
      >
        <AlertTriangle size={18} /> Crash Node
      </button>
      <button
        onClick={onRecoverNode}
        className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg shadow"
      >
        <RefreshCw size={18} /> Recover Node
      </button>

      <button
        onClick={onHealNode}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow"
      >
        <Link size={18} /> Heal Network
      </button>
    </div>
  );
};

export default FaultPanel;