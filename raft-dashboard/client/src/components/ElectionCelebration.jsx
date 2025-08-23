const ElectionCelebration = ({ nodes, messages }) => {
  const elected = (messages || []).find(m => String(m.type).toLowerCase() === "elected");
  if (!elected) return null;
  const node = (nodes || []).find(n => n.id === (elected.toId ?? elected.fromId));
  if (!node) return null;

  const style = {
    left: `${node.position.left}%`,
    top: `${node.position.top}%`,
    transform: "translate(-50%, -50%)",
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="absolute" style={style}>
        <div className="e-burst" />
        <div className="mt-1 text-xs font-semibold text-white bg-emerald-600/90 px-2 py-1 rounded shadow">
          Wins Election!
        </div>
      </div>
    </div>
  );
};

export default ElectionCelebration;