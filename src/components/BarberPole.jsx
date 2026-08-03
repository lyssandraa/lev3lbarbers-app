import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';

// Horizontal stripe height that produces 5 px visual width after 45-deg rotation
const STRIPE_H = 5 * Math.SQRT2; // ≈ 7.07 px
const PERIOD   = STRIPE_H * 3;   // ≈ 21.21 px — one full red+white+cyan cycle

// Large container — the overflow:hidden clip in s.wrap cuts it to 14×44
const C_W = 80;
const REPS = 16;   // 16 cycles × 3 stripes = 48 stripes; total height ≈ 339 px
const C_H = PERIOD * REPS;

// Pre-built stripe list (avoids rebuilding every render)
const STRIPE_LIST = Array.from({ length: REPS }).flatMap((_, i) => [
  { key: `r${i}`, bg: '#ff003c' },
  { key: `w${i}`, bg: '#ffffff' },
  { key: `c${i}`, bg: '#00ccff' },
]);

export default function BarberPole({ isOpen, onPress }) {
  const y       = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (animRef.current) animRef.current.stop();
    y.setValue(0);
    if (isOpen) {
      animRef.current = Animated.loop(
        Animated.timing(y, {
          toValue: PERIOD,          // one seamless stripe cycle
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animRef.current.start();
    }
    return () => { animRef.current?.stop(); };
  }, [isOpen]);

  const inner = (
    <View style={s.wrap}>
      <Animated.View
        style={{
          position: 'absolute',
          width: C_W,
          height: C_H,
          // Keep centre of this container at the centre of the 14×44 clip
          left: 7 - C_W / 2,
          top:  22 - C_H / 2,
          // translateY shifts content in local (pre-rotation) space → seamless loop
          // rotate turns horizontal stripes into 45-degree diagonal bands
          transform: [{ translateY: y }, { rotate: '45deg' }],
        }}
      >
        {STRIPE_LIST.map(stripe => (
          <View
            key={stripe.key}
            style={{ height: STRIPE_H, backgroundColor: stripe.bg, width: C_W }}
          />
        ))}
      </Animated.View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const s = StyleSheet.create({
  wrap: {
    width: 14,
    height: 44,
    borderRadius: 7,
    overflow: 'hidden',
  },
});
