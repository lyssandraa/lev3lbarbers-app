import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, Animated, Easing } from 'react-native';

// Mirrors the website's src/common/IntroReveal.jsx: brand card sits centered
// for 2.5s, then the two dark panels slide apart to reveal the app
// underneath (which has already mounted/loaded behind this overlay).
// Plays once per cold app launch (mounted once from App.js, not re-mounted
// on navigation) — the mobile equivalent of the website's once-per-session
// sessionStorage gate.
//
// Uses React Native's built-in Animated API rather than reanimated/moti —
// reanimated is installed but was never actually exercised anywhere else in
// this app, and turned out to have a broken native module in this build
// (crashed with the same TurboModule abort seen from expo-notifications).
// Animated is already proven working throughout HomeScreen.jsx.

const { width: W } = Dimensions.get('window');
const EASE = Easing.bezier(0.76, 0, 0.24, 1);
const PANEL_TRAVEL = W * 0.55; // 110% of each 50%-width panel
const RED = '#C41E3A';

export default function IntroReveal() {
  const [phase, setPhase] = useState('brand'); // brand | split | done

  const wrapOpacity  = useRef(new Animated.Value(1)).current;
  const panelX        = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = split open
  const brandOpacity  = useRef(new Animated.Value(0)).current;
  const brandY         = useRef(new Animated.Value(0)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoY          = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const seamOpacity   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(brandOpacity, { toValue: 1, duration: 1, useNativeDriver: true }).start();
    Animated.timing(logoOpacity, { toValue: 1, duration: 700, delay: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    Animated.timing(logoY, { toValue: 0, duration: 700, delay: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    Animated.timing(taglineOpacity, { toValue: 0.4, duration: 500, delay: 900, useNativeDriver: true }).start();

    const t1 = setTimeout(() => {
      setPhase('split');
      Animated.timing(panelX, { toValue: 1, duration: 850, easing: EASE, useNativeDriver: true }).start();
      Animated.timing(brandOpacity, { toValue: 0, duration: 350, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
      Animated.timing(brandY, { toValue: -10, duration: 350, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
      Animated.timing(seamOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(wrapOpacity, { toValue: 0, duration: 700, delay: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
    }, 2500);

    const t2 = setTimeout(() => setPhase('done'), 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'done') return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity: wrapOpacity }]}>
      <Animated.View
        style={[
          styles.panel,
          { left: 0, transform: [{ translateX: panelX.interpolate({ inputRange: [0, 1], outputRange: [0, -PANEL_TRAVEL] }) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.panel,
          { right: 0, transform: [{ translateX: panelX.interpolate({ inputRange: [0, 1], outputRange: [0, PANEL_TRAVEL] }) }] },
        ]}
      />

      <Animated.View style={[styles.brand, { opacity: brandOpacity, transform: [{ translateY: brandY }] }]}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
          <Animated.Text style={styles.wordmark}>
            LEV<Animated.Text style={styles.wordmarkAccent}>3</Animated.Text>L
          </Animated.Text>
          <Animated.Text style={styles.sub}>BARBERS</Animated.Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          SOUTHPORT · EST. 2023
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.seam, { opacity: seamOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    overflow: 'hidden',
  },
  panel: {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#0a0a0a',
  },
  brand: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  wordmark: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    letterSpacing: 2,
    color: '#F2EDE4',
    textAlign: 'center',
  },
  wordmarkAccent: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: RED,
  },
  sub: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    letterSpacing: 8,
    color: '#F2EDE4',
    textAlign: 'center',
    marginTop: 2,
  },
  tagline: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    letterSpacing: 6,
    color: '#F2EDE4',
    marginTop: 16,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  seam: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -0.5,
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 1,
  },
});
