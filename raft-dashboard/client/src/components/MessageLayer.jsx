import MessageArrow from "./MessageArrow";

const MessageLayer = ({ nodes, messages }) => {
  // Create a map of node IDs to node objects
  const nodeMap = {};
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
  });

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
      {messages.map((msg, index) => {
        const fromNode = nodeMap[msg.fromId];
        const toNode = nodeMap[msg.toId];

        const fromPos = fromNode?.position;
        const toPos = toNode?.position;

        // 🛑 Skip rendering arrow if positions are invalid
        if (!fromPos || !toPos) return null;

        return (
          <MessageArrow
            key={index}
            from={fromPos}
            to={toPos}
            type={msg.type}
          />
        );
      })}
    </div>
  );
};

export default MessageLayer;