import express from "express";
import cors from "cors";
import { raftCluster } from "./raftCluster/cluster.js";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/raft/state", (req, res) => {
  const state = raftCluster.getClusterState();
  raftCluster.advanceStep(); // advance after every fetch
  res.json(state);
});

app.post("/raft/reset", (req, res) => {
  try {
    raftCluster.resetToInitialState();
    res.status(200).json({ message: "Reset successful" });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Failed to reset Raft cluster" });
  }
});

app.listen(PORT, () => {
  console.log(`Raft Mock Server running at http://localhost:${PORT}/raft/state`);
});