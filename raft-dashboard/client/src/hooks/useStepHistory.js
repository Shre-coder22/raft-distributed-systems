import { useEffect, useState } from "react";

const useStepHistory = (nodes, currentStep, isDynamic) => {
  const [history, setHistory] = useState([]);
  const [selectedStep, setSelectedStep] = useState(0);

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    if (!isDynamic) {
      // Static mode → record history
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[currentStep] = nodes;
        return newHistory;
      });
      setSelectedStep(currentStep);
    } else {
      // Dynamic mode → only keep latest
      setHistory([nodes]);
      setSelectedStep(0);
    }
  }, [nodes, currentStep, isDynamic]);

  const getNodesForStep = (step) => {
    return history[step] || [];
  };

  const resetHistory = () => {
    setHistory([]);
    setSelectedStep(0);
  };

  return {
    history,
    selectedStep,
    setSelectedStep,
    getNodesForStep,
    totalSteps: history.length,
    resetHistory,
  };
};

export default useStepHistory;