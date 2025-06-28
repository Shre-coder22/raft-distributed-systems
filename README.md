# Raft Distributed Systems Lab

# 🚀 Raft: Distributed Consensus Algorithm (MIT 6.824 Labs)

This project implements the Raft consensus algorithm as part of the MIT 6.824 Distributed Systems course.  
Raft is a fault-tolerant protocol used to manage a replicated log across multiple nodes.

---

## ✅ Status:

- [x] Leader Election (Lab 2A)
- [ ] Log Replication (2B)
- [ ] Persistence (2C)

---

## 📄 Features Implemented:

- Raft roles: **Follower**, **Candidate**, **Leader**
- Randomized **election timeouts** to prevent collisions
- Safe leader election via **RequestVote RPC**
- Timeout handling, heartbeat processing, and term updates
- Logging for role transitions and state changes

---

## 🔧 How to Run:

- To test your Raft implementation:
- cd mitraft/raft
- go1.19 test -run 2A

--- 

## 📊 Timeout Tuning (Experiment):

- Default: 200–500ms ⏱ — fast elections, more collisions
- Custom: 300–600ms ⏱ — slower elections, slightly more stability
- Outcome: Stable leader elected by term 10 in both cases.

---

## 📁 Project Structure:

- raft.go           -> Core Raft logic
- config.go         -> Cluster configuration for testing
- persist.go        ->Persistence (2C - to be implemented)
- test_test.go      -> Raft test harness

---

## 📚 Resources:

- Raft Paper
- MIT 6.824 Website
- [Lecture 1 Watched] ✅ Introduction to Raft & Course Overview

---

## 🧠 Next Up:

- Implement log replication (2B)
- Add AppendEntries RPC and matchIndex/nextIndex handling
- Continue with visualizations and benchmark extensions

---
