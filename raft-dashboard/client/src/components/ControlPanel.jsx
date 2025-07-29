import React from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

const ControlPanel = ({ onPlay, onPause, onReset }) => {
  return (
    <div className="flex justify-center gap-6 my-4">
      <button onClick={onPlay} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow">
        <Play size={18} /> Start
      </button>
      <button onClick={onPause} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow">
        <Pause size={18} /> Pause
      </button>
      <button onClick={onReset} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow">
        <RotateCcw size={18} /> Reset
      </button>
    </div>
  );
};

export default ControlPanel;
