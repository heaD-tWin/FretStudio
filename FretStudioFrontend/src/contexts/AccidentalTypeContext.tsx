import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

export type AccidentalType = 'sharps' | 'flats';

interface AccidentalTypeContextType {
  accidentalType: AccidentalType;
  toggleAccidentalType: () => void;
}

const AccidentalTypeContext = createContext<AccidentalTypeContextType | undefined>(undefined);

export const AccidentalTypeProvider = ({ children }: { children: ReactNode }) => {
  const [accidentalType, setAccidentalType] = useState<AccidentalType>(() => {
    const saved = localStorage.getItem('fretstudio-accidental-type');
    return (saved === 'flats' || saved === 'sharps') ? saved : 'sharps';
  });

  useEffect(() => {
    localStorage.setItem('fretstudio-accidental-type', accidentalType);
  }, [accidentalType]);

  const toggleAccidentalType = () => {
    setAccidentalType(prev => (prev === 'sharps' ? 'flats' : 'sharps'));
  };

  return (
    <AccidentalTypeContext.Provider value={{ accidentalType, toggleAccidentalType }}>
      {children}
    </AccidentalTypeContext.Provider>
  );
};

export const useAccidentalType = () => {
  const context = useContext(AccidentalTypeContext);
  if (context === undefined) {
    throw new Error('useAccidentalType must be used within an AccidentalTypeProvider');
  }
  return context;
};