import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FingeringVisibilityContextType {
    isFingeringVisible: boolean;
    toggleFingeringVisibility: () => void;
}

const FingeringVisibilityContext = createContext<FingeringVisibilityContextType | undefined>(undefined);

export const FingeringVisibilityProvider = ({ children }: { children: ReactNode }) => {
    const [isFingeringVisible, setIsFingeringVisible] = useState(true);

    const toggleFingeringVisibility = () => {
        setIsFingeringVisible(prev => !prev);
    };

    return (
        <FingeringVisibilityContext.Provider value={{ isFingeringVisible, toggleFingeringVisibility }}>
            {children}
        </FingeringVisibilityContext.Provider>
    );
};

export const useFingeringVisibility = () => {
    const context = useContext(FingeringVisibilityContext);
    if (context === undefined) {
        throw new Error('useFingeringVisibility must be used within a FingeringVisibilityProvider');
    }
    return context;
};