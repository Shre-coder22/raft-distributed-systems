// backend.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { raftCluster } from "./raftCluster/cluster.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 4000;

// Keep REST endpoints for compatibility
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

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Simple broadcast helper
function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("WS client connected");
  // send initial state
  ws.send(JSON.stringify({ type: "state", payload: raftCluster.getFilteredState() }));

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "invalid json" } }));
      return;
    }

    const { type, payload } = msg;
    try {
      switch (type) {
        case "start_simulation":
          raftCluster.startSimulation();
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true, info: "started" } }));
          break;
        case "pause_simulation":
          raftCluster.pauseSimulation();
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true, info: "paused" } }));
          break;
        case "reset_simulation":
          raftCluster.resetToInitialState();
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true, info: "reset" } }));
          break;
        case "advance_step":
          {
            const newState = raftCluster.advanceStep();
            broadcast("state", newState);
          }
          break;
        case "crash_node":
          raftCluster.crashNode(payload.nodeId);
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true } }));
          broadcast("state", raftCluster.getFilteredState());
          break;
        case "recover_node":
          raftCluster.recoverNode(payload.nodeId);
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true } }));
          broadcast("state", raftCluster.getFilteredState());
          break;
        case "partition_node":
          raftCluster.partitionNode(payload.nodeId);
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true } }));
          broadcast("state", raftCluster.getFilteredState());
          break;
        case "heal_node":
          raftCluster.healNode(payload.nodeId);
          ws.send(JSON.stringify({ type: "ack", payload: { ok: true } }));
          broadcast("state", raftCluster.getFilteredState());
          break;
        case "drop_messages":
          raftCluster.setDropProbability(payload.probability);
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

// Simulation loop: when started, advance step every POLL_INTERVAL ms and broadcast
const POLL_INTERVAL = 1000;
setInterval(() => {
  if (raftCluster.isRunning()) {
    const newState = raftCluster.advanceStep();
    broadcast("state", newState);
  }
}, POLL_INTERVAL);

server.listen(PORT, () => {
  raftCluster.resetToInitialState();
  console.log(`Backend + WS running at http://localhost:${PORT} (ws -> /ws)`);
});