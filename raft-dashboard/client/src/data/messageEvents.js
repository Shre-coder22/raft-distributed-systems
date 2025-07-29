const messageEvents = [
  { step: 1, fromId: 1, toId: 2, type: "requestVote" },
  { step: 1, fromId: 1, toId: 3, type: "requestVote" },
  { step: 2, fromId: 2, toId: 1, type: "appendEntries" },
  { step: 2, fromId: 3, toId: 1, type: "appendEntries" },
  { step: 3, fromId: 4, toId: 5, type: "appendEntries" },
  { step: 3, fromId: 4, toId: 3, type: "appendEntries" },
  { step: 3, fromId: 2, toId: 3, type: "appendEntries" },
  { step: 4, fromId: 5, toId: 4, type: "appendEntries" },
  { step: 4, fromId: 3, toId: 4, type: "appendEntries" },
  // Mock events
];

export default messageEvents;
