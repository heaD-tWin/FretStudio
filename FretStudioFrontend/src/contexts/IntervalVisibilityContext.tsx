import React, { createContext, useState, useContext, useMemo, type ReactNode } from 'react';

// Define the shape of the context data
interface IntervalVisibilityContextType {
  isIntervalVisible: boolean;
  toggleIntervalVisibility: () => void;
}

// Create the context with an undefined initial value
const IntervalVisibilityContext = createContext<IntervalVisibilityContextType | undefined>(undefined);

// Create the provider component
export const IntervalVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isIntervalVisible, setIsIntervalVisible] = useState(true); // Default to visible

  const toggleIntervalVisibility = () => {
    setIsIntervalVisible(prev => !prev);
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isIntervalVisible,
    toggleIntervalVisibility,
  }), [isIntervalVisible]);

  return (
    <IntervalVisibilityContext.Provider value={value}>
      {children}
    </IntervalVisibilityContext.Provider>
  );
};

// Create the custom hook for consuming the context
export const useIntervalVisibility = () => {
  const context = useContext(IntervalVisibilityContext);
  if (context === undefined) {
    throw new Error('useIntervalVisibility must be used within an IntervalVisibilityProvider');
  }
  return context;
};