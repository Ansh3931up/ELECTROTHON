import React from 'react';

const Loading = () => {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      {/* Optional: Add text 
      <p className="ml-4 text-lg text-gray-600">Loading...</p> 
      */}
    </div>
  );
};

export default Loading; 