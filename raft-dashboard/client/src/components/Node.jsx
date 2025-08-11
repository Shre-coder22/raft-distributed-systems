import clsx from "clsx";

const Node = ({ node }) => {
  const { id, state, term, position, log = [] } = node;

  const stateColors = {
    follower: "bg-blue-200 text-blue-800",
    candidate: "bg-yellow-200 text-yellow-800",
    leader: "bg-green-200 text-green-800",
  };
  const termColors = {
    1: "bg-gray-400",
    2: "bg-yellow-400",
    3: "bg-green-400",
    4: "bg-red-400",
    5: "bg-purple-400",
  };

  return (
    <div
      className={clsx(
        "absolute w-28 h-28 flex flex-col items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-in-out",
        stateColors[state]
      )}
      style={{
        left: `${position.left}%`,
        top: `${position.top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <h3 className="font-bold">Node {id}</h3>
      <p className="text-sm">State: {state}</p>
      <p className="text-sm">Term: {term}</p>

      <div className="flex gap-1 mt-2 flex-wrap justify-center">
        {log.map((entry, idx) => (
          <div
            key={idx}
            className={clsx(
              "w-4 h-4 rounded-sm border border-black text-[10px] text-center leading-4",
              termColors[entry.term] || "bg-white"
            )}
            title={`Term ${entry.term}\n${entry.command || ""}`}
          >
            {entry.term}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Node;
