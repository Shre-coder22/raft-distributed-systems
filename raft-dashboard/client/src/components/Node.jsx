import clsx from "clsx";

const Node = ({ node, onClick }) => {
  const { id, role, term, position, logs, status } = node;

  const roleColor = {
    follower: "bg-blue-200 text-blue-800",
    candidate: "bg-yellow-200 text-yellow-800",
    leader: "bg-green-200 text-green-800",
  }[role] || "bg-gray-300";

  const crashedStyle = status === "crashed" ? "opacity-50 grayscale" : "";

  return (
    <div
      onClick={() => onClick(node)}
      className={
        `${roleColor} ${crashedStyle} absolute w-28 h-28 flex flex-col items-center justify-center rounded-full cursor-pointer shadow-lg transition-all duration-300 ease-in-out`
      }
      style={{
        left: `${position.left}%`,
        top: `${position.top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <h3 className="font-bold">Node {id}</h3>
      <p className="text-sm">State: {role}</p>
      <p className="text-sm">Term: {term}</p>

      <div className="flex gap-1 mt-2 flex-wrap justify-center">
        <div className="text-xs mt-2">
          Logs: [{(logs || []).join(", ")}]
        </div>
      </div>
    </div>
  );
};

export default Node;
