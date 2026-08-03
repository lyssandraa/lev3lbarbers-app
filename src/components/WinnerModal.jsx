import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { buildConfettiHtml } from '../screens/play/confettiHtml';

export default function WinnerModal() {
  const { T, isDark } = useTheme();
  const { user } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(T), [T]);

  const [win,     setWin]     = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/scores/winner/pending')
      .then(r => { if (r.data.win) { setWin(r.data.win); setVisible(true); } })
      .catch(() => {});
  }, [user?.id]);

  const dismiss = () => {
    setVisible(false);
    if (win) api.post('/scores/winner/claim').catch(() => {});
  };

  if (!visible || !win) return null;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={s.root}>
        {/* Confetti canvas */}
        <WebView
          style={StyleSheet.absoluteFill}
          source={{ html: buildConfettiHtml(isDark) }}
          originWhitelist={['*']}
          scrollEnabled={false}
          backgroundColor="transparent"
          pointerEvents="none"
        />

        {/* Content */}
        <View style={[s.content, { paddingTop: top + 32, paddingBottom: bottom + 24 }]}>
          <Ionicons name="trophy" size={72} color={T.gold} style={{ marginBottom: 4 }} />

          <Text style={s.wonTitle}>YOU WON!</Text>
          <Text style={s.wonSub}>THIS WEEK'S SNAKE CHAMPION</Text>
          <Text style={s.wonScore}>SCORE  {win.score}</Text>

          <View style={s.prizeBox}>
            <Text style={s.prizeLabel}>YOUR PRIZE</Text>
            <Text style={s.prizeName}>{win.prize || 'A special reward'}</Text>
          </View>

          <Text style={s.claimNote}>
            Show this screen to staff at the shop to claim your prize
          </Text>

          <TouchableOpacity style={s.btn} onPress={dismiss} activeOpacity={0.85}>
            <Text style={s.btnTxt}>CLAIM AT THE SHOP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.dismissBtn} onPress={dismiss} activeOpacity={0.7}>
            <Text style={s.dismissTxt}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(T) { return StyleSheet.create({
  root:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  wonTitle:  { fontFamily: T.fontHead, fontSize: 64, letterSpacing: 6, color: '#fff', lineHeight: 64, marginTop: 8 },
  wonSub:    { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, color: T.gold, marginTop: 4, marginBottom: 12, textTransform: 'uppercase' },
  wonScore:  { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 4, color: 'rgba(255,255,255,0.4)', marginBottom: 28 },

  prizeBox:  {
    borderWidth: 2, borderColor: T.gold,
    paddingVertical: 20, paddingHorizontal: 32,
    alignItems: 'center', marginBottom: 20, width: '100%',
  },
  prizeLabel:{ fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.gold, textTransform: 'uppercase', marginBottom: 6 },
  prizeName: { fontFamily: T.fontHead, fontSize: 32, letterSpacing: 3, color: '#fff', textAlign: 'center' },

  claimNote: { fontFamily: T.fontBody, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 18, marginBottom: 28 },

  btn:      { backgroundColor: T.red, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', width: '100%', marginBottom: 12 },
  btnTxt:   { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 4, color: '#fff' },

  dismissBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  dismissTxt: { fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' },
}); }
