import React, { createContext, useContext, useState } from 'react';

export interface GenerationParams {
  sell_price: string;
  buy_price: string;
  karat: string;
  currency: string;
  note?: string;
  store_name?: string;
  branches?: string;
  contacts?: string;
  group_link?: string;
}

interface AppContextType {
  generatedMessage: string;
  setGeneratedMessage: (msg: string) => void;
  selectedImage: string | null;
  setSelectedImage: (img: string | null) => void;
  lastPriceId: number | null;
  setLastPriceId: (id: number | null) => void;
  lastGenerationParams: GenerationParams | null;
  setLastGenerationParams: (params: GenerationParams | null) => void;
}

const AppContext = createContext<AppContextType>({
  generatedMessage: '',
  setGeneratedMessage: () => {},
  selectedImage: null,
  setSelectedImage: () => {},
  lastPriceId: null,
  setLastPriceId: () => {},
  lastGenerationParams: null,
  setLastGenerationParams: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastPriceId, setLastPriceId] = useState<number | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<GenerationParams | null>(null);

  return (
    <AppContext.Provider value={{
      generatedMessage, setGeneratedMessage,
      selectedImage, setSelectedImage,
      lastPriceId, setLastPriceId,
      lastGenerationParams, setLastGenerationParams,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
