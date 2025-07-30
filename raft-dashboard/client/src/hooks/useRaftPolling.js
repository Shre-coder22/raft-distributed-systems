// client/src/hooks/useRaftPolling.js
import { useEffect, useState } from "react";

const POLL_INTERVAL = 1000;

const useRaftPolling = (isRunning) => {
  const [nodes, setNodes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);

  const fetchState = async () => {
    try {
      const res = await fetch("http://localhost:4000/raft/state");
      const data = await res.json();
      setNodes(data.nodes || []);
      setMessages(data.messages || []);
      setStep(data.step || 0);
    } catch (error) {
      console.error("Polling error:", error);
    }
  };

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isRunning]);

  const reset = async () => {
    try {
      const res = await fetch("http://localhost:4000/raft/reset", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Reset failed");
      await fetchState(); // fetch after reset
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  return { nodes, messages, step, reset };
};

export default useRaftPolling;
