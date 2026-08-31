import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/api';
import { resolveImageUrl } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PIN_LENGTH = 6;
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','back'];

export default function StaffSwitchScreen({ navigation }) {
  const { loginWithToken } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [barbers,    setBarbers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [pin,        setPin]        = useState('');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shakeAnim = useState(new Animated.Value(0))[0];

  // True only when there's genuinely somewhere to go back to. False when
  // this screen is the Shop Mode kiosk landing (root, no parent, no back
  // stack) — in that case there's nothing to close to, so hide the button.
  const canClose = navigation.canGoBack() || !!navigation.getParent();

  useEffect(() => {
    api.get('/barber-profiles')
      .then(r => setBarbers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const back = () => { setSelected(null); setPin(''); setError(''); };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const submitPin = useCallback(async (fullPin, barber) => {
    setSubmitting(true);
    try {
      const res = await api.post('/auth/pin-login', { userId: barber.userId, pin: fullPin });
      await loginWithToken(res.data.token);
      if (navigation.canGoBack()) {
        // Not goBack() — StaffSwitch can be reached via Login's "quick
        // switch with PIN" link, so the screen directly below it isn't
        // always the app; it can be Login itself, leaving the user dumped
        // back on the login screen after a successful PIN login. Navigate
        // to 'MainApp' by name instead, which pops back to it regardless
        // of how deep the stack got.
        navigation.navigate('MainApp');
      } else {
        // Nested as the "Switch Barber" tab: jump back to Home. Mounted as
        // the root Shop Mode kiosk screen (no parent, nothing to go back
        // to): the app-level effect watching `user` resets the stack once
        // it updates, so there's nothing to do here.
        const parent = navigation.getParent();
        if (parent) parent.navigate('MainApp', { screen: 'Home' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect PIN');
      setPin('');
      shake();
      setSubmitting(false);
    }
  }, [loginWithToken, navigation]);

  const handleKey = (key) => {
    if (submitting) return;
    if (key === 'back') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (key === '' || pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    setError('');
    if (next.length === PIN_LENGTH) submitPin(next, selected);
  };

  return (
    <SafeAreaView style={s.safe}>
      {canClose && (
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.getParent()?.navigate('MainApp', { screen: 'Home' });
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
      )}

      {!selected ? (
        <View style={s.content}>
          <Text style={s.eyebrow}>LEV3L BARBERS</Text>
          <Text style={s.title}>Who's Working?</Text>
          <View style={s.rule} />

          {loading ? (
            <ActivityIndicator color={T.gold} style={{ marginTop: 30 }} />
          ) : barbers.length === 0 ? (
            <Text style={s.hint}>No barber profiles set up yet.</Text>
          ) : (
            <View style={s.grid}>
              {barbers.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={s.barberCard}
                  onPress={() => setSelected(b)}
                  activeOpacity={0.8}
                  disabled={!b.userId}
                >
                  {b.imageUrl ? (
                    <Image source={{ uri: resolveImageUrl(b.imageUrl) }} style={s.avatar} />
                  ) : (
                    <View style={s.avatarFallback}>
                      <Text style={s.avatarFallbackText}>{b.displayName?.[0] || '?'}</Text>
                    </View>
                  )}
                  <Text style={s.barberName}>{b.displayName}</Text>
                  {!b.userId && <Text style={s.noAccountTag}>No login set up</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 24 }}>
            <Text style={s.usePasswordLink}>Use email &amp; password instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.content}>
          <TouchableOpacity onPress={back} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
            <Text style={s.backLink}>← Back</Text>
          </TouchableOpacity>

          <Text style={[s.title, { fontSize: 32 }]}>{selected.displayName}</Text>
          <Text style={s.hint}>Enter your {PIN_LENGTH}-digit PIN</Text>

          <Animated.View style={[s.dots, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
            ))}
          </Animated.View>

          {!!error && <Text style={s.errorMsg}>{error}</Text>}

          <View style={s.keypad}>
            {KEYS.map((k, i) => (
              k === ''
                ? <View key={i} style={s.keySpacer} />
                : (
                  <TouchableOpacity
                    key={i}
                    style={s.keyBtn}
                    onPress={() => handleKey(k)}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <Text style={s.keyBtnText}>{k === 'back' ? '⌫' : k}</Text>
                  </TouchableOpacity>
                )
            ))}
          </View>

          {submitting && <ActivityIndicator color={T.red} style={{ marginTop: 16 }} />}
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  closeBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: T.textDim },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  eyebrow: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: T.red, marginBottom: 4 },
  title: { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 3, color: T.text, textAlign: 'center' },
  rule: { width: 36, height: 2, backgroundColor: T.red, marginTop: 10, marginBottom: 24 },
  hint: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, marginTop: 8, marginBottom: 20, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  barberCard: { width: 110, alignItems: 'center', gap: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, borderTopColor: T.red, paddingVertical: 18, paddingHorizontal: 8 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontFamily: T.fontHead, fontSize: 22, color: '#fff' },
  barberName: { fontFamily: T.fontBody, fontSize: 13, color: T.text, textAlign: 'center' },
  noAccountTag: { fontFamily: T.fontBody, fontSize: 9, color: T.textFaint, textAlign: 'center' },

  usePasswordLink: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.red, textAlign: 'center' },
  backLink: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 1, color: T.textDim },

  dots: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: T.border },
  dotFilled: { backgroundColor: T.red, borderColor: T.red },

  errorMsg: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.red, marginBottom: 12, textAlign: 'center' },

  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: 8 },
  keyBtn: { width: 76, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 10 },
  keyBtnText: { fontFamily: T.fontHead, fontSize: 22, color: T.text },
  keySpacer: { width: 76, height: 64, marginBottom: 10 },
}); }
