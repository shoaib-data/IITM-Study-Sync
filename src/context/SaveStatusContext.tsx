import React, { createContext, useContext, useState, useRef } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusContextType {
  status: SaveState;
  errorMessage?: string;
  triggerSaving: () => void;
  triggerSaved: () => void;
  triggerError: (msg?: string) => void;
}

const SaveStatusContext = createContext<SaveStatusContextType>({
  status: 'idle',
  triggerSaving: () => {},
  triggerSaved: () => {},
  triggerError: () => {},
});

export const SaveStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const timeoutRef = useRef<any>(null);

  const triggerSaving = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('saving');
    setErrorMessage(undefined);
  };

  const triggerSaved = () => {
    setStatus('saved');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
    }, 2800);
  };

  const triggerError = (msg?: string) => {
    setStatus('error');
    setErrorMessage(msg || 'Failed to save changes');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
      setErrorMessage(undefined);
    }, 4500);
  };

  return (
    <SaveStatusContext.Provider
      value={{
        status,
        errorMessage,
        triggerSaving,
        triggerSaved,
        triggerError,
      }}
    >
      {children}
    </SaveStatusContext.Provider>
  );
};

export function useSaveStatus() {
  return useContext(SaveStatusContext);
}
