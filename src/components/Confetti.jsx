import React, { useRef, useEffect } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const PALETTE = ['#C41E3A', '#C4922A', '#ffffff', '#FFD700', '#ff6b6b', '#45b7d1', '#a78bfa'];

function buildParticle(colors) {
  return {
    x:       Math.random() * W,
    driftX:  (Math.random() - 0.5) * 80,
    color:   colors[Math.floor(Math.random() * colors.length)],
    w:       Math.random() * 6 + 5,
    h:       Math.random() * 4 + 3,
    dur:     Math.random() * 1600 + 2000,
    delay:   Math.random() * 900,
    rotEnd:  Math.random() * 720 - 360,
    anim:    new Animated.Value(0),
  };
}

export default function Confetti({ count = 60, colors = PALETTE, onDone }) {
  const pRef = useRef(null);
  if (!pRef.current) pRef.current = Array.from({ length: count }, () => buildParticle(colors));
  const particles = pRef.current;

  useEffect(() => {
    Animated.parallel(
      particles.map(p =>
        Animated.timing(p.anim, {
          toValue: 1, duration: p.dur, delay: p.delay, useNativeDriver: true,
        })
      )
    ).start(() => onDone?.());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const tY  = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, H + 80] });
        const tX  = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.driftX] });
        const op  = p.anim.interpolate({ inputRange: [0, 0.05, 0.82, 1], outputRange: [0, 1, 1, 0] });
        const rot = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotEnd}deg`] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: p.x, top: 0,
              width: p.w, height: p.h,
              backgroundColor: p.color,
              opacity: op,
              transform: [{ translateY: tY }, { translateX: tX }, { rotate: rot }],
            }}
          />
        );
      })}
    </View>
  );
}
