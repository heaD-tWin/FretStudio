import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

type Handedness = 'left' | 'right';

interface HandednessContextType {
  handedness: Handedness;
  toggleHandedness: () => void;
}

const HandednessContext = createContext<HandednessContextType | undefined>(undefined);

export const HandednessProvider = ({ children }: { children: ReactNode }) => {
  const [handedness, setHandedness] = useState<Handedness>(() => {
    const saved = localStorage.getItem('fretstudio-handedness');
    const initialValue = (saved === 'left' || saved === 'right') ? saved : 'right';
    console.log(`[HandednessContext] Initializing state from localStorage: ${initialValue}`);
    return initialValue;
  });

  useEffect(() => {
    console.log(`[HandednessContext] Handedness changed to: ${handedness}. Saving to localStorage.`);
    localStorage.setItem('fretstudio-handedness', handedness);
  }, [handedness]);

  const toggleHandedness = () => {
    console.log('[HandednessContext] toggleHandedness called.');
    setHandedness(prev => {
      const newValue = prev === 'right' ? 'left' : 'right';
      console.log(`[HandednessContext] State changing from '${prev}' to '${newValue}'`);
      return newValue;
    });
  };

  return (
    <HandednessContext.Provider value={{ handedness, toggleHandedness }}>
      {children}
    </HandednessContext.Provider>
  );
};

export const useHandedness = () => {
  const context = useContext(HandednessContext);
  if (context === undefined) {
    throw new Error('useHandedness must be used within a HandednessProvider');
  }
  return context;
};