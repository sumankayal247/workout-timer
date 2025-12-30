
import React from 'react';

interface RainbowButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const RainbowButton: React.FC<RainbowButtonProps> = ({ onClick, children, className = '', disabled = false }) => {
  return (
    <div className={`rainbow-border-container ${className} ${disabled ? 'opacity-30 grayscale' : ''}`}>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="rainbow-border-inner w-full h-full flex items-center justify-center bg-white text-gray-800 transition-colors hover:bg-opacity-90"
      >
        {children}
      </button>
    </div>
  );
};

export default RainbowButton;
