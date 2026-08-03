import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <Text style={s.wordmark}>LEV3L BARBERS</Text>
          <View style={s.accentRule} />

          <Text style={s.eyebrow}>Account access</Text>
          <Text style={s.title}>Forgot Password</Text>
          <View style={s.subRule} />

          {sent ? (
            <View style={s.successBox}>
              <Text style={s.successTitle}>Email sent</Text>
              <Text style={s.successBody}>
                If that email has an account, you'll receive a password reset link shortly. Check your inbox (and spam).
              </Text>
              <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('ResetPassword')} activeOpacity={0.8}>
                <Text style={s.btnText}>ENTER RESET CODE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.body}>Enter your email and we'll send you a link to reset your password.</Text>

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

              <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SEND RESET EMAIL</Text>}
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
    scroll:       { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
    wordmark:     { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 5, color: T.textDim, textAlign: 'center', marginBottom: 8 },
    accentRule:   { width: 28, height: 1, backgroundColor: T.red, opacity: 0.7, alignSelf: 'center', marginBottom: 30 },
    eyebrow:      { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: T.red, marginBottom: 4 },
    title:        { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 3, color: T.text, lineHeight: 48 },
    subRule:      { width: 36, height: 2, backgroundColor: T.red, marginTop: 10, marginBottom: 24 },
    body:         { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22, marginBottom: 18 },
    errorBox:     { backgroundColor: T.redDim, borderLeftWidth: 2, borderLeftColor: T.red, padding: 10, marginBottom: 14 },
    errorText:    { fontFamily: T.fontBodyMd, fontSize: 13, color: T.red },
    label:        { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textDim, marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
    input:        { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
    btn:          { backgroundColor: T.red, paddingVertical: 16, alignItems: 'center', marginTop: 22, minHeight: 52, justifyContent: 'center' },
    btnText:      { fontFamily: T.fontHead, fontSize: 17, letterSpacing: 3, color: '#fff' },
    successBox:   { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 20, marginBottom: 20 },
    successTitle: { fontFamily: T.fontHead, fontSize: 24, letterSpacing: 2, color: T.text, marginBottom: 10 },
    successBody:  { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22 },
    backWrap:     { alignItems: 'center', marginTop: 24 },
    backText:     { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  });
}
