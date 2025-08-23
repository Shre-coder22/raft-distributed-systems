export const steps = [
  {
    nodes: [
      { id: 1, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
    ],
    messages: [],
    committed: [],
  },
  {
    nodes: [
      { id: 1, state: "candidate", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
    ],
    messages: [
      { fromId: 1, toId: 2, type: "requestVote" },
      { fromId: 1, toId: 3, type: "requestVote" },
      { fromId: 1, toId: 4, type: "requestVote" },
      { fromId: 1, toId: 5, type: "requestVote" },
    ],
    committed: [],
  },
  {
    nodes: [
      { id: 1, state: "candidate", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
    ],
    messages: [
      { fromId: 2, toId: 1, type: "voteGiven" },
      { fromId: 3, toId: 1, type: "voteGiven" },
      { fromId: 4, toId: 1, type: "voteGiven" },
      { fromId: 5, toId: 1, type: "voteGiven" },
    ],
    committed: [],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "" } ] },
    ],
    messages: [
      { fromId: 1, toId: 2, type: "appendEntries" },
      { fromId: 1, toId: 3, type: "appendEntries" },
      { fromId: 1, toId: 4, type: "appendEntries" },
      { fromId: 1, toId: 5, type: "appendEntries" },
    ],
    committed: [],
  },
  {
    nodes: [
      { id: 1, state: "leader", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 4, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 2, toId: 1, type: "reply" },
      { fromId: 3, toId: 1, type: "reply" },
      { fromId: 4, toId: 1, type: "reply" },
      { fromId: 5, toId: 1, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "crashed", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "candidate", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 3, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 4, state: "candidate", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 5, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 4, toId: 3, type: "requestVote" },
      { fromId: 4, toId: 5, type: "requestVote" },
      { fromId: 2, toId: 3, type: "requestVote" },
      { fromId: 2, toId: 5, type: "requestVote" },
    ],
    committed: [
      {term: 1, command: "x=1" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "crashed", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 4, state: "candidate", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 3, toId: 4, type: "voteGiven" },
      { fromId: 5, toId: 4, type: "voteGiven" },
    ],
    committed: [
      {term: 1, command: "x=1" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "crashed", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
    ],
    messages: [
      { fromId: 4, toId: 5, type: "appendEntries" },
      { fromId: 4, toId: 3, type: "appendEntries" },
      { fromId: 4, toId: 2, type: "appendEntries" },
      { fromId: 4, toId: 1, type: "appendEntries" },
    ],
    committed: [
      {term: 1, command: "x=1" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "crashed", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 2, toId: 4, type: "reply" },
      { fromId: 3, toId: 4, type: "reply" },
      { fromId: 5, toId: 4, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "crashed", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 4, toId: 5, type: "appendEntries" },
      { fromId: 4, toId: 3, type: "appendEntries" },
      { fromId: 4, toId: 2, type: "appendEntries" },
      { fromId: 4, toId: 1, type: "appendEntries" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 2, toId: 4, type: "reply" },
      { fromId: 3, toId: 4, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" }
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 4, toId: 5, type: "appendEntries" },
      { fromId: 4, toId: 3, type: "appendEntries" },
      { fromId: 4, toId: 2, type: "appendEntries" },
      { fromId: 4, toId: 1, type: "appendEntries" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 1, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "leader", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 2, toId: 4, type: "reply" },
      { fromId: 3, toId: 4, type: "reply" },
      { fromId: 1, toId: 4, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 2, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "candidate", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 3, toId: 1, type: "requestVote" },
      { fromId: 3, toId: 2, type: "requestVote" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "candidate", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 1, toId: 3, type: "voteGiven" },
      { fromId: 2, toId: 3, type: "voteGiven" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 1, command: "x=1" } ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "leader", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 3, toId: 1, type: "appendEntries" },
      { fromId: 3, toId: 2, type: "appendEntries" },
      { fromId: 3, toId: 4, type: "appendEntries" },
      { fromId: 3, toId: 5, type: "appendEntries" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "leader", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "follower", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"} ] },
    ],
    messages: [
      { fromId: 1, toId: 3, type: "reply" },
      { fromId: 2, toId: 3, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"},  ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 3, state: "leader", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"}, {term: 3, command: "a=4"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
    ],
    messages: [
      { fromId: 3, toId: 1, type: "appendEntries" },
      { fromId: 3, toId: 2, type: "appendEntries" },
      { fromId: 3, toId: 4, type: "appendEntries" },
      { fromId: 3, toId: 5, type: "appendEntries" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"}
    ]
  },
  {
    nodes: [
      { id: 1, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"}, ] },
      { id: 2, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"}, {term: 3, command: "a=4"} ] },
      { id: 3, state: "leader", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"}, {term: 3, command: "a=4"} ] },
      { id: 4, state: "crashed", term: 2, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"} ] },
      { id: 5, state: "follower", term: 3, log: [ {term: 1, command: "x=1" }, {term: 2, command: "y=2"}, {term: 2, command: "z=3"}, {term: 3, command: "a=4"} ] },
    ],
    messages: [
      { fromId: 5, toId: 3, type: "reply" },
      { fromId: 1, toId: 3, type: "reply" },
      { fromId: 2, toId: 3, type: "reply" },
    ],
    committed: [
      {term: 1, command: "x=1" },
      {term: 2, command: "y=2" },
      {term: 2, command: "z=3"},
      {term: 3, command: "a=4"}
    ]
  },
];