const simulationSteps = [
  [
    { id: 1, state: "follower", term: 1, position: { left: 65, top: 30 } },
    { id: 2, state: "follower", term: 1, position: { left: 80, top: 55 } },
    { id: 3, state: "follower", term: 1, position: { left: 50, top: 80 } },
    { id: 4, state: "follower", term: 1, position: { left: 20, top: 55 } },
    { id: 5, state: "follower", term: 1, position: { left: 35, top: 30 } },
  ],
  [
    { id: 1, state: "candidate", term: 2, position: { left: 65, top: 30 } },
    { id: 2, state: "follower", term: 2, position: { left: 80, top: 55 } },
    { id: 3, state: "follower", term: 2, position: { left: 50, top: 80 } },
    { id: 4, state: "follower", term: 2, position: { left: 20, top: 55 } },
    { id: 5, state: "follower", term: 2, position: { left: 35, top: 30 } },
  ],
  [
    { id: 1, state: "leader", term: 2, position: { left: 65, top: 30 } },
    { id: 2, state: "follower", term: 2, position: { left: 80, top: 55 } },
    { id: 3, state: "follower", term: 2, position: { left: 50, top: 80 } },
    { id: 4, state: "follower", term: 2, position: { left: 20, top: 55 } },
    { id: 5, state: "follower", term: 2, position: { left: 35, top: 30 } },
  ],
  [
    { id: 1, state: "leader", term: 2, position: { left: 65, top: 30 } },
    { id: 2, state: "candidate", term: 3, position: { left: 80, top: 55 } },
    { id: 3, state: "follower", term: 2, position: { left: 50, top: 80 } },
    { id: 4, state: "candidate", term: 3, position: { left: 20, top: 55 } },
    { id: 5, state: "follower", term: 2, position: { left: 35, top: 30 } },
  ],
  [
    { id: 1, state: "follower", term: 3, position: { left: 65, top: 30 } },
    { id: 2, state: "follower", term: 3, position: { left: 80, top: 55 } },
    { id: 3, state: "follower", term: 3, position: { left: 50, top: 80 } },
    { id: 4, state: "leader", term: 3, position: { left: 20, top: 55 } },
    { id: 5, state: "follower", term: 3, position: { left: 35, top: 30 } },
  ],
  // Mock steps for UI visualization.
];

export default simulationSteps;
