import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

import { AuthProvider }  from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import IntroReveal from './src/common/IntroReveal';

// Diagnostic: catches any render/lifecycle error anywhere below it and shows
// it on screen instead of leaving a blank/black view with no indication of
// what failed. Does not catch errors thrown during module import itself.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.log('ErrorBoundary caught:', error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#B00020', paddingTop: 60, paddingHorizontal: 16 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            App crashed — diagnostic view
          </Text>
          <ScrollView>
            <Text style={{ color: '#fff', fontSize: 13 }}>
              {String(this.state.error?.message || this.state.error)}
            </Text>
            <Text style={{ color: '#ffcccc', fontSize: 11, marginTop: 16 }}>
              {String(this.state.error?.stack || '')}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { T, isDark } = useTheme();

  // Diagnostic: load AppNavigator via a runtime require() inside try/catch,
  // instead of a static top-level import, so a failure during its (or any
  // of its dependencies') module evaluation is catchable and shown on
  // screen instead of failing silently before React ever renders anything.
  const [navState, setNavState] = useState({ Comp: null, error: null });
  useEffect(() => {
    try {
      const mod = require('./src/navigation/AppNavigator');
      setNavState({ Comp: mod.default, error: null });
    } catch (err) {
      console.log('AppNavigator require() failed:', err);
      setNavState({ Comp: null, error: err });
    }
  }, []);

  if (navState.error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#B0700A', paddingTop: 60, paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
          AppNavigator failed to load
        </Text>
        <ScrollView>
          <Text style={{ color: '#fff', fontSize: 13 }}>
            {String(navState.error?.message || navState.error)}
          </Text>
          <Text style={{ color: '#ffe0b0', fontSize: 11, marginTop: 16 }}>
            {String(navState.error?.stack || '')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!navState.Comp) return null; // still requiring AppNavigator

  const AppNavigator = navState.Comp;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: T.bg }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Gates rendering of BOTH AppShell and IntroReveal on the same fonts-ready
// check — IntroReveal used to mount immediately as a sibling with no font
// check of its own, so its "LEV3L" text would briefly render in the system
// fallback font before swapping to Bebas Neue once fonts finished loading.
function AppRoot() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });

  // Diagnostic: force render after 4s even if useFonts never settles
  // (neither resolves nor rejects), to rule out a silent hang.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded && !fontError && !timedOut) return null;

  return (
    <>
      <AppShell />
      <IntroReveal />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  );
}
