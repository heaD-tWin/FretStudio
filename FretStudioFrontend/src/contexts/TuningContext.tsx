import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

interface TuningContextType {
  selectedTuning: string;
  setSelectedTuning: (tuning: string) => void;
}

const TuningContext = createContext<TuningContextType | undefined>(undefined);

export const TuningProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTuning, setSelectedTuning] = useState<string>('Standard Guitar');

  return (
    <TuningContext.Provider value={{ selectedTuning, setSelectedTuning }}>
      {children}
    </TuningContext.Provider>
  );
};

export const useTuning = () => {
  const context = useContext(TuningContext);
  if (context === undefined) {
    throw new Error('useTuning must be used within a TuningProvider');
  }
  return context;
};