const radius = 25; // percent radius from center
const centerX = 50;
const centerY = 60;
const totalNodes = 5;

const initialNodes = Array.from({ length: totalNodes }, (_, i) => {
  const angle = (2 * Math.PI * i) / totalNodes - Math.PI / 2; // rotate so top node is first
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  return {
    id: i + 1,
    state: "follower", // initial state
    term: 0,
    position: { left: x, top: y },
  };
});

export default initialNodes;
