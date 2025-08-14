import express from "express";
import cors from "cors";
import { createServer } from "http";
import WebSocket from 'ws';
import { WebSocketServer } from "ws";
import { raftCluster } from "./raftCluster/cluster.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 4000;

// REST endpoints
app.get("/raft/state", (req, res) => {
  res.json(raftCluster.getFilteredState());
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

app.post("/nodes/:id/crash", (req, res) => {
  try {
    raftCluster.crashNode(parseInt(req.params.id, 10));
    res.status(200).json({ message: `Node ${req.params.id} crashed.` });
  } catch (err) {
    console.error("Crash error:", err);
    res.status(500).json({ error: "Failed to crash node" });
  }
});

app.post("/nodes/:id/recover", (req, res) => {
  try {
    raftCluster.recoverNode(parseInt(req.params.id, 10));
    res.status(200).json({ message: `Node ${req.params.id} recovered.` });
  } catch (err) {
    console.error("Recover error:", err);
    res.status(500).json({ error: "Failed to recover node" });
  }
});

app.post("/network/partition/:id", (req, res) => {
  try {
    raftCluster.partitionNode(parseInt(req.params.id, 10));
    res.status(200).json({ message: `Node ${req.params.id} partitioned.` });
  } catch (err) {
    console.error("Partition error:", err);
    res.status(500).json({ error: "Failed to partition node" });
  }
});

app.post("/network/heal/:id", (req, res) => {
  try {
    raftCluster.healNode(parseInt(req.params.id, 10));
    res.status(200).json({ message: `Node ${req.params.id} healed.` });
  } catch (err) {
    console.error("Heal error:", err);
    res.status(500).json({ error: "Failed to heal node" });
  }
});

app.post("/nodes/:id/force-timeout", (req, res) => {
  try {
    raftCluster.forceTimeout(parseInt(req.params.id, 10));
    res.status(200).json({ message: `Node ${req.params.id} forced to timeout.` });
  } catch (err) {
    console.error("Force timeout error:", err);
    res.status(500).json({ error: "Failed to force node timeout" });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const broadcast = (type, payload) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  });
};

wss.on("connection", (ws) => {
  console.log("WS client connected");
  ws.send(JSON.stringify({ type: "state", payload: raftCluster.getFilteredState() }));

  ws.on("message", (data) => {
    console.log("[WS] Raw incoming message:", data.toString());
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", payload: { message: "invalid json" } }));
      return;
    }

    const { type, payload } = msg;
    try {
      console.log(`[WS] Handling message type: ${type}`);
      switch (type) {
        case "get_state":
          ws.send(JSON.stringify({ type: "state", payload: raftCluster.getFilteredState() }));
          break;

        case "advance_step":
          raftCluster.advanceStep();
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "reset":
          raftCluster.resetToInitialState();
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "start":
          raftCluster.startSimulation();
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "pause":
          raftCluster.pauseSimulation();
          broadcast("state", raftCluster.getFilteredState());  
          break;

        case "crash_node":
          raftCluster.crashNode(payload.nodeId);
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "recover_node":
          raftCluster.recoverNode(payload.nodeId);
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "partition_node":
          raftCluster.partitionNode(payload.nodeId);
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "heal_node":
          raftCluster.healNode(payload.nodeId);
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "set_drop_probability":
          raftCluster.setDropProbability(payload.nodeId, payload.probability);
          broadcast("state", raftCluster.getFilteredState());
          break;

        case "force_timeout":
          raftCluster.forceTimeout(payload.nodeId);
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true } }));
          broadcast("state", raftCluster.getFilteredState());
          break;

        default:
          ws.send(JSON.stringify({ type: "error", payload: { message: "unknown event" } }));
      }
    } catch (err) {
      console.error("WS handler error:", err);
      ws.send(JSON.stringify({ type: "error", payload: { message: String(err) } }));
    }
  });

  ws.on("close", () => {
    console.log("WS client disconnected");
  });
});

const POLL_INTERVAL = 1000;
setInterval(() => {
  if (raftCluster.isRunning()) {
    const newState = raftCluster.advanceStep();
    broadcast("state", newState);

    // NEW: detect static movie end + not dynamic
    const atEnd = !raftCluster.isDynamic() &&
      !raftCluster.isRunning() &&
      raftCluster.getCurrentStep() >= raftCluster.getTotalSteps() - 1;

    if (atEnd) {
      broadcast("info", { message: "Reached end of static sequence." });
    }
  }
}, POLL_INTERVAL);

server.listen(PORT, () => {
  raftCluster.resetToInitialState();
  console.log(`Backend + WS running at http://localhost:${PORT} (ws -> /ws)`);
});