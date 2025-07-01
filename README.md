# Raft Distributed Systems Lab:


# 🚀 Raft: Distributed Consensus Algorithm (MIT 6.824 Labs):

This project implements the **Raft consensus algorithm** as part of the MIT 6.824 Distributed Systems course.  
Raft is a fault-tolerant protocol used to manage a replicated log across multiple nodes with clear state transitions and strong leadership guarantees.

---

## ✅ Lab Progress:

| Lab | Description             | Status |
|-----|-------------------------|--------|
| 2A  | Leader Election         | ✅ Done |
| 2B  | Log Replication         | ⏳ Pending |
| 2C  | Persistence             | ⏳ Pending |

---

## 📄 Features Implemented (Lab 2A):

- Raft roles: **Follower**, **Candidate**, **Leader**
- **Randomized election timeouts** to reduce collisions
- **RequestVote RPC** for safe elections
- **Term updates** and **vote handling**
- **Heartbeat detection** via AppendEntries
- Logging for **timeouts**, **state changes**, and **election results**

---

## 🧪 2A Test Behavior Summary:

### 🔹 TestInitialElection2A
- Nodes start as followers
- One node times out and starts election
- Other nodes grant votes
- A stable leader is elected in **Term 1**

### 🔹 TestReElection2A

| Term | Events |
|------|--------|
| 1 | Node 1 times out, gets votes → Becomes Leader |
| 2 | Node 0 times out after heartbeat loss → Becomes Leader |
| 3–7 | Repeated **split votes** between Node 1 and 2 (timeouts too close) |
| 8 | Node 1 starts election, Node 2 grants vote before it can timeout → **Node 1 becomes Leader** |

- **Split votes** occurred due to closely timed timeouts (within 5–10ms), preventing nodes from gathering majority votes.
- **Final win** happens when a follower receives a **RequestVote** before it starts its own election.

---

## ⏱ Timeout Tuning (Experiment):

- Configured election timeout: **150ms–300ms**
- Result:
  - Early leader elected in `TestInitialElection2A`
  - Multiple re-elections and split votes in `TestReElection2A`
- Insight:
  - If election timers are too close (e.g., within 5–10ms), **collisions** and **vote splitting** are common
  - More spread-out timers = more stable elections

---

## 📁 Project Structure:

| File         | Purpose                                |
|--------------|----------------------------------------|
| `raft.go`    | Core Raft logic: roles, elections, RPCs |
| `config.go`  | Cluster simulation for testing         |
| `persist.go` | Persistent state (for Lab 2C)          |
| `test_test.go` | Raft test harness                    |

---

## 🔧 Run Tests:

-cd mitraft/raft
-go1.19 test -run 2A

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
