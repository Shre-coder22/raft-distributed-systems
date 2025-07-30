export const steps = [
  {
    nodes: [
      { id: 1, state: "follower", term: 1 },
      { id: 2, state: "follower", term: 1 },
      { id: 3, state: "follower", term: 1 },
      { id: 4, state: "follower", term: 1 },
      { id: 5, state: "follower", term: 1 },
    ],
    messages: [],
  },
  {
    nodes: [
      { id: 1, state: "candidate", term: 2 },
      { id: 2, state: "follower", term: 2 },
      { id: 3, state: "follower", term: 2 },
      { id: 4, state: "follower", term: 2 },
      { id: 5, state: "follower", term: 2 },
    ],
    messages: [
      { fromId: 1, toId: 2, type: "requestVote" },
      { fromId: 1, toId: 3, type: "requestVote" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 2 },
      { id: 2, state: "follower", term: 2 },
      { id: 3, state: "follower", term: 2 },
      { id: 4, state: "follower", term: 2 },
      { id: 5, state: "follower", term: 2 },
    ],
    messages: [
      { fromId: 2, toId: 1, type: "appendEntries" },
      { fromId: 3, toId: 1, type: "appendEntries" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 2 },
      { id: 2, state: "candidate", term: 2 },
      { id: 3, state: "follower", term: 2 },
      { id: 4, state: "candidate", term: 2 },
      { id: 5, state: "follower", term: 2 },
    ],
    messages: [
      { fromId: 4, toId: 3, type: "appendEntries" },
      { fromId: 4, toId: 5, type: "appendEntries" },
      { fromId: 2, toId: 3, type: "appendEntries" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 2 },
      { id: 2, state: "follower", term: 2 },
      { id: 3, state: "follower", term: 2 },
      { id: 4, state: "leader", term: 2 },
      { id: 5, state: "follower", term: 2 },
    ],
    messages: [
      { fromId: 5, toId: 4, type: "appendEntries" },
      { fromId: 3, toId: 4, type: "appendEntries" },
    ],
  },
];