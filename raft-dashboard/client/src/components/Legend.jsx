const Legend = () => {
  const Item = ({ color, label }) => (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs text-gray-100">{label}</span>
    </div>
  );

  return (
    <div className="absolute right-3 bottom-3 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg space-y-1 pointer-events-auto">
      <div className="text-xs font-semibold text-gray-200 mb-1">Legend</div>
      <Item color="bg-green-400" label="Heartbeat / AppendEntries" />
      <Item color="bg-blue-400"  label="AppendEntries Reply (ACK)" />
      <Item color="bg-amber-400" label="RequestVote" />
      <Item color="bg-indigo-400" label="Vote Granted" />
      <Item color="bg-gray-400"  label="Dropped Message" />
    </div>
  );
};

export default Legend;