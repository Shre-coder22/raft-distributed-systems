import { useEffect, useState } from "react";

const StepSlider = ({ currentStep, maxStep, onChange, isRunning }) => {
  const [localStep, setLocalStep] = useState(currentStep);

  // Sync slider with currentStep from App whenever polling is active
  useEffect(() => {
    setLocalStep(currentStep);
  }, [currentStep]);

  const handleChange = (e) => {
    const newStep = parseInt(e.target.value, 10);
    setLocalStep(newStep);
    onChange(newStep); 
  };

  return (
    <div className="w-3/4 mx-auto mt-6">
      <label className="text-white text-sm mb-1 block text-center">
        Step: {localStep} / {maxStep}
      </label>
      <input
        type="range"
        min={0}
        max={maxStep}
        step={1}
        value={localStep}
        onChange={handleChange}
        className="w-full accent-blue-500"
      />
    </div>
  );
};

export default StepSlider;