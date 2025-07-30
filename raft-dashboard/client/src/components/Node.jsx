import clsx from "clsx";

const Node = ({ node }) => {
  const { id, state, term, position } = node;

  const stateColors = {
    follower: "bg-blue-200 text-blue-800",
    candidate: "bg-yellow-200 text-yellow-800",
    leader: "bg-green-200 text-green-800",
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
    </div>
  );
};

export default Node;
