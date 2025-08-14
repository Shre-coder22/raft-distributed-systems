import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = "ws://localhost:4000/ws";

const useRaftSocket = () => {
  const wsRef = useRef(null);
  const [state, setState] = useState({ step: 0, nodes: [], messages: [] });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("WS connected");
    };
    ws.onmessage = (ev) => {
      console.log("[useRaftSocket] Received raw message:", ev.data);
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") {
          setState(msg.payload);
        } else if (msg.type === "ack") {
          console.log("ack:", msg.payload);
        } else if (msg.type === "error") {
          console.error("server error:", msg.payload);
        }
      } catch (e) {
        console.error("invalid message", e);
      }
    };
    ws.onclose = () => {
      setConnected(false);
      console.log("WS closed, attempting reconnect in 1s");
      setTimeout(() => {
        // simple reconnect
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          wsRef.current = null;
          // re-run effect by setting something? For simplicity, reload page or rely on user refresh.
        }
      }, 1000);
    };

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, []);

  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open");
      return;
    }
    console.log("[useRaftSocket] Sending:", { type, payload });
    ws.send(JSON.stringify({ type, payload }));
  }, []);

  return {
    connected,
    state,
    send, 
  };
};

export default useRaftSocket;