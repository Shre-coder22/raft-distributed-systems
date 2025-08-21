const CommittedBar = ({ committed = [] }) => {
  // show last 8 commands as chips + a "+N" overflow pill
  const tail = committed.slice(-8);
  const extra = Math.max(0, committed.length - tail.length);

  return (
    <div className="px-4 mt-1 mb-2">
      <div className="flex items-center gap-2 text-xs text-white/80">
        <span className="uppercase tracking-wide text-[11px] opacity-80">
          Committed ({committed.length})
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {tail.map((e, i) => (
            <span
              key={`${i}-${e.command}-${e.term}`}
              className="px-2 py-0.5 rounded bg-emerald-600/80 text-white shadow-sm text-[11px]"
              title={`t${e.term} • ${e.command}`}
            >
              {e.command}
            </span>
          ))}
          {extra > 0 && (
            <span
              className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px]"
              title={`${extra} more committed`}
            >
              +{extra}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommittedBar;