import { useEffect, useState } from "react";

const NodeDetailsModal = ({
  nodeData,
  onClose,
  onCrash,
  onRecover,
  onForceTimeout,
  onSetDropProbability,
  send,
}) => {
  const [lossPct, setLossPct] = useState(0);
  const [cmd, setCmd] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") submitCommand(); // convenience
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, cmd, nodeData?.id]);

  useEffect(() => {
    setCmd("");
    setLossPct(Math.round(((nodeData?.dropProb || 0) * 100) ?? 0)); // if you store per-node prob in state later
  }, [nodeData?.id]);

  if (!nodeData) return null;

  const isCrashed = (nodeData.role === "crashed" || nodeData.status === "crashed");
  const isPartitioned = nodeData.status === "partitioned";
  const isLeader = nodeData.role === "leader";
  const leaderInputDisabled = !isLeader || isCrashed || isPartitioned;

  const statusKey =
    nodeData.role === "crashed" || nodeData.status === "crashed"
      ? "crashed"
      : (nodeData.status === "partitioned" ? "partitioned" : "healthy");

  const statusColor = {
    healthy: "bg-green-500",
    crashed: "bg-red-500",
    partitioned: "bg-yellow-500",
  }[statusKey];

  const applyDropProb = () => {
    const prob01 = Math.max(0, Math.min(1, lossPct / 100));
    onSetDropProbability?.(nodeData.id, prob01);
  };

  const submitCommand = () => {
    const value = cmd.trim();
    if (!value || leaderInputDisabled) return;
    // Leader-only: append a client command to leader’s log via WS
    send?.("client_command", { command: value, nodeId: nodeData.id });
    setCmd("");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
        {/* Close */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✖
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-4">Node {nodeData.id}</h2>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 text-white rounded ${statusColor}`}>
            {statusKey}
          </span>
          <span className="px-2 py-1 bg-blue-500 text-white rounded capitalize">
            {isCrashed ? "" : nodeData.role}
          </span>
          <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded">
            Term: {nodeData.term}
          </span>
        </div>

        {/* Logs */}
        <div className="text-sm font-medium text-gray-700">Log Entries</div>
        <div className="text-gray-700 mb-4 max-h-20 overflow-y-auto pr-1">
          {(nodeData.log || []).length
            ? (nodeData.log || []).map((e, i) => (
                <span
                  key={i}
                  className="inline-block text-[10px] leading-tight px-1 py-[2px] mr-1 mb-1 rounded bg-gray-800 text-gray-100"
                  title={`term ${e.term}`}
                >
                  {e.command}
                </span>
              ))
            : <span className="text-xs text-gray-500">No logs</span>}
        </div>

        {/* Leader-only client command */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700">Client Command (leader only)</div>
          <div className="flex gap-2 mt-1">
            <input
              className={`flex-1 border rounded px-2 py-1 text-sm ${leaderInputDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder='e.g., x=42'
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              disabled={leaderInputDisabled}
            />
            <button
              onClick={submitCommand}
              disabled={leaderInputDisabled || !cmd.trim()}
              className={`px-3 py-1 rounded text-white ${leaderInputDisabled || !cmd.trim() ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              Append
            </button>
          </div>
          {!isLeader && (
            <div className="text-[11px] text-gray-500 mt-1">
              Only the current leader can accept client commands.
            </div>
          )}
        </div>

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
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded disabled:opacity-50"
            disabled={isCrashed}
            onClick={() => onForceTimeout(nodeData.id)}
          >
            Force Timeout
          </button>
          <button onClick={() => send("drop_latest_log", { nodeId: nodeData.id })} className="w-full bg-slate-600 hover:bg-slate-700 text-white py-1 px-3 rounded">
            Drop Latest Log
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