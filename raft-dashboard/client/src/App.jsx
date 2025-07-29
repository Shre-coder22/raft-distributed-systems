import ControlPanel from "./components/ControlPanel";
import Node from "./components/Node";
import useSimulation from "./hooks/useSimulation";
import MessageArrow from "./components/MessageArrow";
import messageEvents from "./data/messageEvents";

const App = () => {
  const { nodes, step, play, pause, reset } = useSimulation();

  const getNodeById = (id) => nodes.find((n) => n.id === id);

  const messagesToRender = messageEvents.filter((msg) => msg.step === step);

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <h1 className="text-4xl text-white font-bold text-center pt-6">Raft Dashboard</h1>
      <ControlPanel onPlay={play} onPause={pause} onReset={reset} />

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}

      {messagesToRender.map((msg, idx) => {
        const from = getNodeById(msg.fromId)?.position;
        const to = getNodeById(msg.toId)?.position;

        return (
          <MessageArrow key={idx} from={from} to={to} type={msg.type} />
        );
      })}
    </div>
  );
};

export default App;
