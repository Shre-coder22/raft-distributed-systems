const Node = ({ node, onClick }) => {
  const { id, role, term, position, status } = node;
  
  const roleColor = {
    follower: "bg-blue-200 text-blue-800",
    candidate: "bg-yellow-200 text-yellow-800",
    leader: "bg-green-200 text-green-800",
    crashed: "bg-slate-200 text-slate-800",
  }[role] || "bg-gray-300 text-gray-800";

  const crashedStyle = status === "crashed" ? "opacity-50 grayscale" : "";
  const partitionStyle = status === "partitioned" ? "border-4 border-yellow-500 animate-pulse" : "";

  return (
    <div
      onClick={() => onClick(node)}
      className={`
        ${roleColor} ${crashedStyle} ${partitionStyle}
        absolute w-28 h-28 flex flex-col items-center justify-center
        rounded-full cursor-pointer shadow-lg transition-all duration-300 ease-in-out
      `}
      style={{
        left: `${position.left}%`,
        top: `${position.top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <h3 className="font-bold flex items-center gap-2">
        Node {id}
        {role === "leader" && (
          <span className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded-full uppercase">
            Leader
          </span>
        )}
      </h3>
      <p className="text-sm">State: {role}</p>
      <p className="text-sm">Term: {term}</p>
      <p className="text-sm">{role === "crashed" ? "crashed" : "healthy"}</p>

      <div className="flex gap-1 mt-2 flex-wrap justify-center">
        <div className="text-xs text-white mt-2">
          Logs: {node.log.map(e => e.command).join(', ')}
        </div>
      </div>
    </div>
  );
};

export default Node;