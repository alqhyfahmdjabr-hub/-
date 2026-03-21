import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  generatedMessage: string;
  setGeneratedMessage: (msg: string) => void;
  selectedImage: string | null;
  setSelectedImage: (img: string | null) => void;
  lastPriceId: number | null;
  setLastPriceId: (id: number | null) => void;
}

const AppContext = createContext<AppContextType>({
  generatedMessage: '',
  setGeneratedMessage: () => {},
  selectedImage: null,
  setSelectedImage: () => {},
  lastPriceId: null,
  setLastPriceId: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastPriceId, setLastPriceId] = useState<number | null>(null);

  return (
    <AppContext.Provider value={{
      generatedMessage, setGeneratedMessage,
      selectedImage, setSelectedImage,
      lastPriceId, setLastPriceId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
