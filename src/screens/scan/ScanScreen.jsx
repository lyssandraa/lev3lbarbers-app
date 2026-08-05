import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StampSection from '../admin/sections/StampSection';
import { useTheme } from '../../context/ThemeContext';

// Dedicated tab for staff/admin — scan a customer's QR to add a stamp.
// Distinct from the customer-facing Loyalty tab, which shows the
// customer's own card and QR code, not a scanner.
export default function ScanScreen() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>SCAN CUSTOMER</Text>
      </View>
      <StampSection />
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 2, color: T.text },
}); }
