import React from "react";

const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 12 }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="border-4 border-t-blue-500 border-b-blue-500 border-gray-200 rounded-full animate-spin"
        style={{ width: `${size}px`, height: `${size}px` }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
