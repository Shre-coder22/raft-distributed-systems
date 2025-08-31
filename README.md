# Raft Distributed Systems Lab + Dashboard

This repo contains an **instrumented Raft implementation** (Go, based on MIT 6.824 labs 2A–2C) paired with a **fault-injectable dashboard** (React/Node).  
It supports reproducible experiments on **leader failover**, **replication latency**, and **leader tenure** with paper-ready plots.

## Components
- `raft/`: Go Raft implementation (leader election, log replication, commit).
- `raft-dashboard/`: Dashboard with server (Node) and client (React/Tailwind).
  - `server/raft_experiments/analyze_raft_results.py`: Python analysis script.
  - `server/raft_experiments/metrics/`: Example CSVs + figures.
- `artifact/`: supplementary material
  - `notes/`: exported day-by-day engineering logs (Obsidian → Markdown).
  - `configs/`: configuration scripts.
  - `supplementary/`: extra figures.

## Environment
- Windows 11
- Go 1.19+
- Node 20.10.0, npm 10.2.3
- Python 3.10.3
- pandas, numpy, matplotlib

## Setup
```bash
# 1. Create Python venv
py -m venv venv
./venv/Scripts/Activate.ps1
pip install -U pip pandas numpy matplotlib

# 2. Run dashboard
# Terminal 1 (server)
cd raft-dashboard/server
npm run dev

# Terminal 2 (client)
cd raft-dashboard/client
npm run dev
```

## Analysis
After running experiments, analyze metrics:
```bash
cd raft-dashboard/server
py raft_experiments/analyze_raft_results.py --input ./metrics --out ./metrics/figures
```
### Generates:
failover_cdf.png
leader_tenure_box.png
replication_latency_vs_drop.png

## Artifact & Reproducibility
Example data/figures: server/raft_experiments/metrics/
Notes: artifact/notes/
Reproduce plots: run the analyzer with --input ./metrics --out ./metrics/figures.

## Citation
If you use this artifact, please cite:

@misc{raft_dashboard_2025,
  author = {Shrestha Saxena},
  title = {Instrumented Raft + Dashboard: Measuring Failover, Latency, and Tenure},
  year = {2025},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = url : {https://github.com/Shre-coder22/raft-distributed-systems-lab}
}
