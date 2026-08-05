import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainApp');
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

          <Text style={s.eyebrow}>Welcome back</Text>
          <Text style={s.title}>Log In</Text>
          <View style={s.subRule} />

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="john.smith@example.com"
            placeholderTextColor={T.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>PASSWORD</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1, borderRightWidth: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={T.textFaint}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
              <Text style={s.eyeText}>{showPw ? '○' : '●'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>LOG IN</Text>}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>No account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={s.switchLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('StaffSwitch')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={s.switchText}>Staff? <Text style={s.switchLink}>Quick switch with PIN</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: T.bg },
    closeBtn:   { position: 'absolute', top: 16, right: 20, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    closeText:  { fontSize: 22, color: T.textDim },
    scroll:     { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
    wordmark:   { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 5, color: T.textDim, textAlign: 'center', marginBottom: 8 },
    accentRule: { width: 28, height: 1, backgroundColor: T.red, opacity: 0.7, alignSelf: 'center', marginBottom: 30 },
    eyebrow:    { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: T.red, marginBottom: 4 },
    title:      { fontFamily: T.fontHead, fontSize: 52, letterSpacing: 4, color: T.text, lineHeight: 56 },
    subRule:    { width: 36, height: 2, backgroundColor: T.red, marginTop: 10, marginBottom: 24 },
    errorBox:   { backgroundColor: T.redDim, borderLeftWidth: 2, borderLeftColor: T.red, padding: 10, marginBottom: 14 },
    errorText:  { fontFamily: T.fontBodyMd, fontSize: 13, color: T.red },
    label:      { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textDim, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
    input:      { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
    inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
    eyeBtn:     { paddingHorizontal: 14, paddingVertical: 13 },
    eyeText:    { color: T.textDim, fontSize: 14 },
    forgotWrap: { alignItems: 'flex-end', marginTop: 8, marginBottom: 4 },
    forgotText: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textDim },
    btn:        { backgroundColor: T.red, paddingVertical: 16, alignItems: 'center', marginTop: 22, minHeight: 52, justifyContent: 'center' },
    btnText:    { fontFamily: T.fontHead, fontSize: 17, letterSpacing: 3, color: '#fff' },
    switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
    switchText: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
    switchLink: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.red },
  });
}
