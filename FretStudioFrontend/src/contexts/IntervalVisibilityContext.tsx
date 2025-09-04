import React, { createContext, useState, useContext, useMemo, type ReactNode } from 'react';

interface IntervalVisibilityContextType {
  isIntervalVisible: boolean;
  toggleIntervalVisibility: () => void;
}

const IntervalVisibilityContext = createContext<IntervalVisibilityContextType | undefined>(undefined);

export const IntervalVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isIntervalVisible, setIsIntervalVisible] = useState(true);

  const toggleIntervalVisibility = () => {
    setIsIntervalVisible(prev => !prev);
  };

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

export const useIntervalVisibility = () => {
  const context = useContext(IntervalVisibilityContext);
  if (context === undefined) {
    throw new Error('useIntervalVisibility must be used within an IntervalVisibilityProvider');
  }
  return context;
};