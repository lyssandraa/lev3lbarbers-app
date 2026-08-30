import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

// mode: 'staff' | 'admin'
export default function CreateAccountsSection({ mode }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const isAdmin = mode === 'admin';
  const endpoint = isAdmin ? '/auth/admin/create-admin' : '/auth/admin/create-staff';
  const label = isAdmin ? 'ADMIN' : 'STAFF';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.post(endpoint, { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      setSuccess(`${label} account created for ${form.name.trim()}.`);
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || `Could not create ${label.toLowerCase()} account.`);
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>CREATE {label} ACCOUNT</Text>
        <Text style={s.hint}>
          {isAdmin
            ? 'Admin accounts have full access to all admin panel sections. Use with caution.'
            : 'Staff accounts can access Stamp Manager, Verify Claim, and Shop Status.'
          }
        </Text>

        {!!success && (
          <View style={[s.msg, { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)' }]}>
            <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
            <Text style={[s.msgText, { color: '#22c55e' }]}>{success}</Text>
          </View>
        )}
        {!!error && (
          <View style={[s.msg, { borderColor: T.red, backgroundColor: T.redDim }]}>
            <Ionicons name="alert-circle" size={15} color={T.red} />
            <Text style={[s.msgText, { color: T.red }]}>{error}</Text>
          </View>
        )}

        <Text style={s.fieldLabel}>FULL NAME *</Text>
        <TextInput style={s.input} value={form.name} onChangeText={set('name')} placeholder="Full name" placeholderTextColor={T.textFaint} autoCapitalize="words" />

        <Text style={s.fieldLabel}>EMAIL ADDRESS *</Text>
        <TextInput style={s.input} value={form.email} onChangeText={set('email')} placeholder="email@example.com" placeholderTextColor={T.textFaint} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

        <Text style={s.fieldLabel}>PASSWORD *</Text>
        <TextInput style={s.input} value={form.password} onChangeText={set('password')} placeholder="Min. 8 characters" placeholderTextColor={T.textFaint} secureTextEntry />

        <TouchableOpacity
          style={[s.btn, saving && s.btnDim, isAdmin && { backgroundColor: T.gold }]}
          onPress={create}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <View style={s.row}>
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text style={s.btnText}>CREATE {label} ACCOUNT</Text>
            </View>
          )}
        </TouchableOpacity>

        {isAdmin && (
          <View style={s.warning}>
            <Ionicons name="warning-outline" size={15} color={T.gold} />
            <Text style={s.warningText}>Admin accounts have the same access as you. Only create accounts for trusted team members.</Text>
          </View>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 18 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 10 },
  hint: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 16, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 12, marginBottom: 14 },
  msgText: { fontFamily: T.fontBodyMd, fontSize: 13, flex: 1 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 16 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: 10, borderWidth: 1, borderColor: T.gold, backgroundColor: T.goldDim },
  warningText: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.text, flex: 1, lineHeight: 18 },
}); }
