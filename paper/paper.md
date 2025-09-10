---
title: "Making Raft Visible: an instrumented consensus implementation with a fault-injectable dashboard"
tags:
  - distributed systems
  - consensus
  - raft
  - measurement
  - reproducibility
authors:
  - name: Shrestha Saxena
    orcid: 0009-0005-2254-4804
    affiliation: 1
affiliations:
  - name: Department of Computer Science and Engineering, Rajiv Gandhi Institute of Petroleum Technology (RGIPT), Jais, Uttar Pradesh, India
    index: 1
date: 2025-09-09
bibliography: paper.bib
---

# Summary
Raft is a leader-based consensus protocol for state machine replication: a cluster elects a single leader via randomized timeouts; clients send operations to the leader, which appends them to a replicated log and commits entries once a majority acknowledges. Safety is ensured by leader election and log-matching rules; liveness is maintained under crash faults and unreliable networks through heartbeats and timeouts. Raft targets the same fault model and efficiency as Multi-Paxos while being simpler to understand and implement [@ongaro2014; @lamport1998].

Raft is widely taught, yet its timing behavior under failures is rarely quantified outside production systems. This package provides a compact, instrumented Raft implementation plus a browser dashboard for **fault injection** (leader crashes, packet loss) and **ground-truth logging** (election start, leader elected, first heartbeat, replication commit). The toolkit turns classroom Raft into a **measurable system**: users run scripted experiments and regenerate all plots from CSV metrics.

**Illustrative use of the software.** The package exposes a fault-injection workflow that orchestrates leader crashes and packet-loss regimes, timestamps ground-truth events (election start, leader elected, first heartbeat, replication commit), and regenerates figures from the resulting CSV logs. The repository includes scripted runs and small example datasets that exercise this pipeline end-to-end. The numbers shown in the example figures are the direct output of the software's default scenarios; their role is to demonstrate functionality and reproducibility of the artifact. Users can vary seeds, timeouts, and drop rates (or add new scenarios) to obtain their own measurements.

# Statement of need
Researchers and instructors have visual demos of Raft, but lack **open, reproducible** tools to **measure** failover and replication under controlled churn. This package fills that gap with (i) an instrumented Raft core, (ii) a UI that injects faults and records events, and (iii) an analysis pipeline that yields CDFs, tenure distributions, and latency-vs-loss plots. It targets courses, benchmarking, and practitioners exploring timeout/SLO trade-offs in consensus systems [@ongaro2014; @lamport1998].

# State of the field
Production Raft systems (e.g., etcd) and formal verification frameworks (e.g., Verdi) emphasize **correctness** and safety proofs [@etcd; @wilcox2015]. Educational visualizations (e.g., Stanford's Raft viz; MIT 6.824 labs) illustrate protocol dynamics but generally lack **ground-truth metrics** and **reproducible long-run** experiments [@stanfordviz; @mit6824]. Our contribution is a lightweight **measurement pipeline** complementary to these efforts.

# Functionality and quality control

The repository provides three components:

- **Instrumented Raft core** (`raft/`) with event hooks for elections, heartbeats, and replication.
- **Fault-injectable dashboard** (`raft-dashboard/server/`, `raft-dashboard/client/`) to trigger leader crashes and packet-drop rates and to visualize state.
- **Metrics and analysis** (`raft-dashboard/server/raft_experiments/`) that log ground-truth events to CSV and regenerate figures (CDFs, leader-tenure, latency-vs-loss).

Quality control:

- **Tests:** Go unit tests for election and log-matching invariants (e.g., `go test -run 2A`), plus `go test ./...`.
- **CI:** GitHub Actions workflow runs tests/lint on push and PRs.
- **Reproducibility:** Timers in the UI are slowed for pedagogy; the analyzer normalizes times by 25x to reflect common practice (heartbeat ~100 ms; election timeout 240–400 ms), preserving ratios and Raft dynamics. Fixed seeds and deterministic crash schedules regenerate the example figures.

# Installation & quick start

Install prerequisites (Go >=1.19, Node >=20, Python >=3.10). Then start the dashboard (server and client in separate shells) and run the analyzer on the example metrics to regenerate figures.

```bash
# clone and enter the repo
git clone https://github.com/Shre-coder22/raft-distributed-systems-lab
cd raft-distributed-systems-lab

# server
cd raft-dashboard/server
npm install
npm run dev

# client (new shell)
cd raft-dashboard/client
npm install
npm run dev

# analyze an example dataset (writes figures under ./metrics_100run/figures)
cd ../server
py raft_experiments/analyze_raft_results.py --input ./metrics_100run --out ./metrics_100run/figures
# (use 'python' instead of 'py' on some systems)