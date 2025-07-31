import { useEffect, useState } from "react";

const useStepHistory = (nodes, currentStep) => {
  const [history, setHistory] = useState([]);
  const [selectedStep, setSelectedStep] = useState(0);

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    setHistory((prev) => {
      const newHistory = [...prev];
      newHistory[currentStep] = nodes;
      return newHistory;
    });

    setSelectedStep(currentStep);
  }, [nodes, currentStep]);

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