import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

const STEPS = 40;
const DURATION = 800;

export default function PriceCountUp({ price, style, duration = DURATION }) {
  const target = parseFloat(price) || 0;
  const isFloat = target % 1 !== 0;
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!target) return;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setVal(target * step / STEPS);
      if (step >= STEPS) clearInterval(interval);
    }, duration / STEPS);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <Text style={style}>
      £{isFloat ? val.toFixed(2) : Math.round(val)}
    </Text>
  );
}
