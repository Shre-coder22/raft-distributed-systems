import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = "ws://localhost:4000/ws";

const useRaftSocket = () => {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState({ step: 0, nodes: [], messages: [], mode: "static" });

  const connectRef = useRef({ attempts: 0 });
  const outboxRef = useRef([]); // queued messages while socket closed

  const flushOutbox = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (outboxRef.current.length) {
      ws.send(outboxRef.current.shift());
    }
  };

  const openSocket = useCallback(() => {
    // Prevent duplicate sockets
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      connectRef.current.attempts = 0;
      // ask current state on reconnect
      ws.send(JSON.stringify({ type: "get_state", payload: {} }));
      flushOutbox();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") {
          setState(msg.payload);
        } else if (msg.type === "ack") {
          // optional: console.log("WS ack", msg.payload);
        } else if (msg.type === "error") {
          console.error("WS server error:", msg.payload);
        }
      } catch (e) {
        console.error("WS invalid message", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // retry with jittered backoff
      const n = Math.min(6, connectRef.current.attempts + 1);
      connectRef.current.attempts = n;
      const delay = 400 * n + Math.floor(Math.random() * 300);
      setTimeout(() => {
        // ensure we didn't get another live socket in the meantime
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          openSocket();
        }
      }, delay);
    };

    ws.onerror = () => {
      // rely on onclose to reconnect
    };
  }, []);

  useEffect(() => {
    openSocket();
    return () => {
      try { wsRef.current?.close(); } catch {}
    };
  }, [openSocket]);

  const send = useCallback((type, payload = {}) => {
    const serialized = JSON.stringify({ type, payload });
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // queue & try to reconnect
      outboxRef.current.push(serialized);
      openSocket();
      return;
    }
    ws.send(serialized);
  }, [openSocket]);

  const reconnect = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    openSocket();
  }, [openSocket]);

  return { connected, state, send, reconnect };
};

export default useRaftSocket;