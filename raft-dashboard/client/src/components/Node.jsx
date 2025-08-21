const LogPreview = ({ log = [] }) => {
  const entries = Array.isArray(log) ? log : [];
  const tail = entries.slice(-2);
  const extra = Math.max(0, entries.length - tail.length);

  return (
    <div className="mt-2 group relative select-none">
      {/* inline chips */}
      <div className="flex items-center gap-1 flex-wrap justify-center overflow-hidden max-w-[96px] mx-auto">
        {tail.map((e, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 text-[10px] rounded bg-white/80 text-gray-800 shadow-sm"
            title={e.command}
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            {e.command}
          </span>
        ))}
        {extra > 0 && (
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-black/70 text-white"
            title={`${extra} more`}
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            +{extra}
          </span>
        )}
      </div>

      {/* hover popover */}
      {entries.length > 0 && (
        <div
          className="
            hidden group-hover:block absolute left-1/2 -translate-x-1/2 mt-2 z-50
            w-44 max-h-40 overflow-auto rounded-lg border border-white/10
            bg-gray-800/95 text-white shadow-xl backdrop-blur
          "
          onMouseDown={(ev) => ev.stopPropagation()}
        >
          <div className="text-[11px] font-semibold px-2 pt-2 pb-1 sticky top-0 bg-gray-800/95">
            Log ({entries.length})
          </div>
          <ul className="text-[11px] px-2 pb-2 space-y-1">
            {entries.map((e, idx) => (
              <li
                key={idx}
                className="flex items-center gap-1 whitespace-nowrap"
                title={e.command}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{e.command}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const Node = ({ node, onClick }) => {
  const { id, role, term, position, log = [], status } = node;
  
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
        ${role === "leader" && status !== "crashed" ? "leader-pulse" : ""}
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
      <p className="text-sm">{status === "crashed" ? "crashed" : "healthy"}</p>

      <LogPreview log={log} />
    </div>
  );
};

export default Node;