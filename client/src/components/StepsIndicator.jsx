const StepsIndicator = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center space-x-4 mb-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${index < currentStep ? 'bg-green-500' : 
              index === currentStep ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}
            text-white text-sm font-medium
          `}>
            {index < currentStep ? '✓' : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 ${
              index < currentStep - 1 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          )}
          <div className={`absolute mt-10 text-xs w-20 text-center ${
            index === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
          }`}>
            {step}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StepsIndicator; 