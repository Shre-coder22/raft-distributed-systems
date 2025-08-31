import { useMemo, useRef } from "react";

/** ---------- Helpers ---------- **/
const resolveIds = (m) => ({
  fromId: m.fromId ?? m.from ?? m.src ?? m.srcId ?? m.senderId,
  toId:   m.toId   ?? m.to   ?? m.dst ?? m.dstId ?? m.receiverId,
});

const canonType = (t) => {
  const s = String(t || "").toLowerCase();
  if (s.includes("append") || s === "hb" || s.includes("heartbeat"))                       return "appendEntries";
  if (s.includes("reply") || s.includes("appendentriesreply") || s.includes("ack"))        return "reply";
  if (s.includes("requestvote") || s === "rv")                                             return "requestVote";
  if (s.includes("votegiven") || s === "grant" || s === "vote")                            return "voteGiven";
  return s; 
};

const pctToPx = (container, pos) => {
  const rect = container.getBoundingClientRect();
  return {
    x: rect.width * (pos.left / 100),
    y: rect.height * (pos.top / 100),
  };
};

/** One moving ball along a straight path using CSS motion-path */
const PulseBall = ({ startPx, endPx, kind, duration = 2400, delay = 0, dropMidway = false }) => {
  const path = `M ${startPx.x} ${startPx.y} L ${endPx.x} ${endPx.y}`;
  const style = {
    offsetPath: `path("${path}")`,
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`,
  };

  let colorClass = "bg-gray-300";
  if (kind === "hb")   colorClass = "bg-green-400";   // AppendEntries / heartbeat
  if (kind === "ack")  colorClass = "bg-blue-400";    // AE reply
  if (kind === "rv")   colorClass = "bg-amber-400";   // RequestVote
  if (kind === "vote") colorClass = "bg-indigo-400";  // VoteGranted
  if (kind === "drop") colorClass = "bg-gray-400";    // dropped mid-flight

  return (
    <div
      className={`pulse-dot ${colorClass} ${dropMidway ? "pulse-fade-mid" : ""}`}
      style={style}
    />
  );
};

/** ---------- Main Layer ---------- **/
const HeartbeatBallsLayer = ({ nodes, messages, paused }) => {
  const containerRef = useRef(null);

  const nodeById = useMemo(() => {
    const m = new Map();
    (nodes || []).forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const pulses = useMemo(() => {
    if (!nodes?.length) return [];

    const out = [];
    (messages || []).forEach((raw, idx) => {
      const { fromId, toId } = resolveIds(raw);
      const type = canonType(raw.type);
      const from = nodeById.get(fromId);
      const to = nodeById.get(toId);
      if (!from || !to) return;

      const dropped = String(raw.type || "").toLowerCase().includes("(drop)");
      const baseKey = `${type}-${fromId}-${toId}-${idx}`;

      switch (type) {
        case "appendEntries": // leader -> follower (heartbeat / log replication)
          out.push({
            key: `${baseKey}-hb`,
            kind: dropped ? "drop" : "hb",
            fromId,
            toId,
            duration: 1200, 
            delay: 0,
            dropMidway: dropped,
          });
          break;

        case "reply": // follower -> leader ack for AE
          out.push({
            key: `${baseKey}-ack`,
            kind: dropped ? "drop" : "ack",
            fromId,
            toId,
            duration: 900, 
            delay: 150,     
            dropMidway: dropped,
          });
          break;

        case "requestVote": // candidate -> peer
          out.push({
            key: `${baseKey}-rv`,
            kind: dropped ? "drop" : "rv",
            fromId,
            toId,
            duration: 1200,
            delay: 0,
            dropMidway: dropped,
          });
          break;

        case "voteGiven": // peer -> candidate (vote granted)
          out.push({
            key: `${baseKey}-vg`,
            kind: dropped ? "drop" : "vote",
            fromId,
            toId,
            duration: 900,
            delay: 150,
            dropMidway: dropped,
          });
          break;

        default:
          // ignore unknowns; still supports "(drop)" suffix conventions
          break;
      }
    });

    return out;
  }, [nodes, messages, nodeById]);

  return (
    <div ref={containerRef} className={`pointer-events-none absolute inset-0 ${paused ? "hb-paused" : ""}`}>
      {containerRef.current &&
        pulses.map((p) => {
          const from = nodeById.get(p.fromId);
          const to = nodeById.get(p.toId);
          if (!from || !to) return null;

          const startPx = pctToPx(containerRef.current, from.position);
          const endPx = pctToPx(containerRef.current, to.position);

          return (
            <PulseBall
              key={p.key}
              startPx={startPx}
              endPx={endPx}
              kind={p.kind}
              duration={p.duration}
              delay={p.delay}
              dropMidway={p.dropMidway}
            />
          );
        })}
    </div>
  );
};

export default HeartbeatBallsLayer;