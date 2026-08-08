import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local (not synced from the backend) — turning this on makes THIS
// device a shop kiosk: when nobody's logged in, the barber picker/PIN screen
// is the landing experience instead of the customer-facing app.
const KEY = 'shopMode';

const ShopModeContext = createContext(null);

export function ShopModeProvider({ children }) {
  const [shopMode, setShopModeState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      setShopModeState(v === 'true');
      setReady(true);
    });
  }, []);

  const setShopMode = async (value) => {
    setShopModeState(value);
    await AsyncStorage.setItem(KEY, value ? 'true' : 'false');
  };

  return (
    <ShopModeContext.Provider value={{ shopMode, setShopMode, ready }}>
      {children}
    </ShopModeContext.Provider>
  );
}

export function useShopMode() {
  return useContext(ShopModeContext);
}
