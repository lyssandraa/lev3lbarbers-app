import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';

export default function ResetPasswordScreen({ navigation }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [token,    setToken]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!token.trim() || !password) { setError('Please fill in both fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // No parent means this was reached with nothing already in history
      // (e.g. Shop Mode kiosk reset to StaffSwitch first) — reset() rather
      // than navigate() so there's no stale screen left underneath to
      // reach by swiping back once inside MainApp.
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <Text style={s.wordmark}>LEV3L BARBERS</Text>
          <View style={s.accentRule} />

          <Text style={s.eyebrow}>Account access</Text>
          <Text style={s.title}>Reset Password</Text>
          <View style={s.subRule} />

          {done ? (
            <View style={s.successBox}>
              <Text style={s.successTitle}>Password reset!</Text>
              <Text style={s.successBody}>Your password has been updated. You can now log in with your new password.</Text>
              <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                <Text style={s.btnText}>BACK TO LOGIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.body}>
                Copy the reset token from the email we sent you, then enter it below along with your new password.
              </Text>

              {!!error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Text style={s.label}>RESET TOKEN</Text>
              <TextInput
                style={s.input}
                value={token}
                onChangeText={setToken}
                placeholder="Paste token from email"
                placeholderTextColor={T.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.label}>NEW PASSWORD</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1, borderRightWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  placeholderTextColor={T.textFaint}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
                  <Text style={s.eyeText}>{showPw ? '○' : '●'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>RESET PASSWORD</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.backWrap}>
            <Text style={s.backText}>← Back to Login</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: T.bg },
    closeBtn:     { position: 'absolute', top: 16, right: 20, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    closeText:    { fontSize: 22, color: T.textDim },
    scroll:       { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
    wordmark:     { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 5, color: T.textDim, textAlign: 'center', marginBottom: 8 },
    accentRule:   { width: 28, height: 1, backgroundColor: T.red, opacity: 0.7, alignSelf: 'center', marginBottom: 30 },
    eyebrow:      { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: T.red, marginBottom: 4 },
    title:        { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 3, color: T.text, lineHeight: 48 },
    subRule:      { width: 36, height: 2, backgroundColor: T.red, marginTop: 10, marginBottom: 24 },
    body:         { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22, marginBottom: 18 },
    errorBox:     { backgroundColor: T.redDim, borderLeftWidth: 2, borderLeftColor: T.red, padding: 10, marginBottom: 14 },
    errorText:    { fontFamily: T.fontBodyMd, fontSize: 13, color: T.red },
    label:        { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textDim, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
    input:        { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
    inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
    eyeBtn:       { paddingHorizontal: 14, paddingVertical: 13 },
    eyeText:      { color: T.textDim, fontSize: 14 },
    btn:          { backgroundColor: T.red, paddingVertical: 16, alignItems: 'center', marginTop: 22, minHeight: 52, justifyContent: 'center' },
    btnText:      { fontFamily: T.fontHead, fontSize: 17, letterSpacing: 3, color: '#fff' },
    successBox:   { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 20, marginBottom: 20 },
    successTitle: { fontFamily: T.fontHead, fontSize: 24, letterSpacing: 2, color: T.text, marginBottom: 10 },
    successBody:  { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22 },
    backWrap:     { alignItems: 'center', marginTop: 24 },
    backText:     { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  });
}
