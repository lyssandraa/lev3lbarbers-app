import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [showPw,       setShowPw]       = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in name, email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, referralCode.trim() || undefined, newsletterOptIn);
      // reset(), not navigate('MainApp') — Signup is reachable via
      // StaffSwitch → Login → Signup, and StaffSwitch can be the ROOT of
      // the stack with no MainApp already in history (Shop Mode kiosk).
      // navigate() only pops back to an existing MainApp; when there isn't
      // one, it pushes a new instance instead, leaving Login/StaffSwitch
      // stacked underneath and reachable by swiping back. See the same fix
      // in LoginScreen/StaffSwitchScreen.
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
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

          <Text style={s.eyebrow}>Join the level</Text>
          <Text style={s.title}>Sign Up</Text>
          <View style={s.subRule} />

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>USERNAME</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. john_smith"
            placeholderTextColor={T.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={s.hint}>3–20 chars · letters, numbers, underscores only</Text>

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
              placeholder="Min 8 chars, upper, lower, number, symbol"
              placeholderTextColor={T.textFaint}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
              <Text style={s.eyeText}>{showPw ? '○' : '●'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>REFERRAL CODE <Text style={s.optional}>(optional)</Text></Text>
          <TextInput
            style={s.input}
            value={referralCode}
            onChangeText={setReferralCode}
            placeholder="e.g. ABC123"
            placeholderTextColor={T.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity style={s.checkRow} onPress={() => setNewsletterOptIn(v => !v)} activeOpacity={0.7}>
            <View style={[s.checkbox, newsletterOptIn && s.checkboxOn]}>
              {newsletterOptIn && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>Send me news, offers and updates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>CREATE ACCOUNT</Text>}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.switchLink}>Log in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
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
  optional:   { fontFamily: T.fontBody, fontSize: 10, color: T.textFaint, textTransform: 'none' },
  hint:       { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginTop: 4 },
  input:      { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  eyeBtn:     { paddingHorizontal: 14, paddingVertical: 13 },
  eyeText:    { color: T.textDim, fontSize: 14 },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  checkbox:   { width: 20, height: 20, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: T.red, borderColor: T.red },
  checkLabel: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, flexShrink: 1 },
  btn:        { backgroundColor: T.red, paddingVertical: 16, alignItems: 'center', marginTop: 26, minHeight: 52, justifyContent: 'center' },
  btnText:    { fontFamily: T.fontHead, fontSize: 17, letterSpacing: 3, color: '#fff' },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  switchText: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  switchLink: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.red },
}); }
