// Use angles to create pentagon positions in percentage
const getNodePosition = (index, total, radiusPercent) => {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    left: 50 + radiusPercent * Math.cos(angle),  // % left
    top: 50 + radiusPercent * Math.sin(angle),   // % top
  };
};

const totalNodes = 5;
const radiusPercent = 35; // % from center (adjust for spacing)

export const initialNodes = Array.from({ length: totalNodes }, (_, i) => {
  const pos = getNodePosition(i, totalNodes, radiusPercent);
  return {
    id: i + 1,
    state: "follower",
    term: 1,
    left: `${pos.left}%`,
    top: `${pos.top}%`,
  };
});
