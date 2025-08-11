import { useEffect, useState } from "react";

const StepSlider = ({ currentStep, maxStep, onChange }) => {
  const [localStep, setLocalStep] = useState(currentStep);

  useEffect(() => {
    setLocalStep(currentStep);
  }, [currentStep]);

  const handleChange = (e) => {
    const newStep = parseInt(e.target.value, 10);
    setLocalStep(newStep);
    onChange(newStep);
  };

  const steps = Array.from({ length: maxStep + 1 }, (_, i) => i);

  return (
    <div className="w-3/4 mx-auto mt-6">
      <div className="relative w-full">
        {/* Slider */}
        <input
          type="range"
          min={0}
          max={maxStep}
          step={1}
          value={localStep}
          onChange={handleChange}
          className="w-full accent-blue-500"
        />

        {/* Step numbers */}
        <div className="absolute top-1/2 w-full flex justify-between px-[8px] pointer-events-none">
          {steps.map((step) => (
            <span
              key={step}
              className={`text-xs ${
                step === localStep ? "text-yellow-400 font-bold" : "text-white"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepSlider;