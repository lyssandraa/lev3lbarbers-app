import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIGHT = {
  bg:        '#f4f0e8',
  surface:   '#ede9df',
  card:      '#e5e0d5',
  text:      '#1a1a1a',
  textDim:   'rgba(26,26,26,0.55)',
  textFaint: 'rgba(26,26,26,0.28)',
  gold:      '#C4922A',
  goldDim:   'rgba(196,146,42,0.18)',
  red:       '#C41E3A',
  redDim:    'rgba(196,30,58,0.10)',
  border:    'rgba(26,26,26,0.10)',
  borderMd:  'rgba(26,26,26,0.20)',
  fontHead:  'BebasNeue_400Regular',
  fontBody:  'Montserrat_400Regular',
  fontBodyMd:'Montserrat_500Medium',
  fontBodyBd:'Montserrat_700Bold',
};

export const DARK = {
  bg:        '#0E1118',
  surface:   '#141B26',
  card:      '#1A2235',
  text:      '#EAE0CA',
  textDim:   'rgba(234,224,202,0.44)',
  textFaint: 'rgba(234,224,202,0.22)',
  gold:      '#C4922A',
  goldDim:   'rgba(196,146,42,0.16)',
  red:       '#C41E3A',
  redDim:    'rgba(196,30,58,0.14)',
  border:    'rgba(255,255,255,0.07)',
  borderMd:  'rgba(255,255,255,0.13)',
  fontHead:  'BebasNeue_400Regular',
  fontBody:  'Montserrat_400Regular',
  fontBodyMd:'Montserrat_500Medium',
  fontBodyBd:'Montserrat_700Bold',
};

const ThemeCtx = createContext({ T: LIGHT, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('appTheme')
      .then(v => { if (v === 'dark') setIsDark(true); })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('appTheme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  return (
    <ThemeCtx.Provider value={{ T: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
