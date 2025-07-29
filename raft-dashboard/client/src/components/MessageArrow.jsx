import { motion } from "framer-motion";

const arrowColors = {
  appendEntries: "stroke-green-400",
  requestVote: "stroke-yellow-400",
};

const MessageArrow = ({ from, to, type }) => {
  if (!from || !to) return null;

  const x1 = `${from.left}%`;
  const y1 = `${from.top}%`;
  const x2 = `${to.left}%`;
  const y2 = `${to.top}%`;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
        className={`stroke-2 ${arrowColors[type] || "stroke-white"}`}
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
        </marker>
      </defs>
    </svg>
  );
};

export default MessageArrow;
