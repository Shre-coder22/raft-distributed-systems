import { useState, useEffect, useRef } from "react";
import simulationSteps from "../data/simulationSteps";

const useSimulation = () => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const totalSteps = simulationSteps.length;
  const nodes = simulationSteps[step];

  // Play the simulation
  const play = () => {
    if (intervalRef.current) return; // preventing multiple intervals

    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setStep((prev) => {
        if (prev + 1 >= totalSteps) {
          pause();
          return prev;
        }
        return prev + 1;
      });
    }, 1000); // 1 second per step (as of now)
  };

  // Pause playback
  const pause = () => {
    setIsPlaying(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  // Reset to step 0
  const reset = () => {
    pause();
    setStep(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return { nodes, step, isPlaying, play, pause, reset };
};

export default useSimulation;
