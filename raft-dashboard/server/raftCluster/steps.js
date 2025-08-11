export const steps = [
  {
    nodes: [
      { id: 1, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
    ],
    messages: [],
  },
  {
    nodes: [
      { id: 1, state: "candidate", term: 2, log: [ {term: 1, command: "init" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "init" } ] },
    ],
    messages: [
      { fromId: 1, toId: 2, type: "requestVote" },
      { fromId: 1, toId: 3, type: "requestVote" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "init" } ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "init" } ] },
      { id: 4, state: "follower", term: 2, log: [ {term: 1, command: "init" } ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "init" } ] },
    ],
    messages: [
      { fromId: 2, toId: 1, type: "appendEntries" },
      { fromId: 3, toId: 1, type: "appendEntries" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 2, state: "candidate", term: 3, log: [ {term: 2, command: "x=1" } ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 4, state: "candidate", term: 3, log: [ {term: 2, command: "x=1" } ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 4, toId: 3, type: "requestVote" },
      { fromId: 4, toId: 5, type: "requestVote" },
      { fromId: 2, toId: 3, type: "requestVote" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
      { id: 4, state: "leader", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 2, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 5, toId: 4, type: "appendEntries" },
      { fromId: 3, toId: 4, type: "appendEntries" },
    ],
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
      { id: 3, state: "follower", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
      { id: 4, state: "leader", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
      { id: 5, state: "follower", term: 3, log: [ {term: 2, command: "x=1" }, {term: 3, command: "y=2"} ] },
    ],
  },
];