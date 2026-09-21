import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const FIELDS = [
  { key: 'stampDays',      label: 'STAMP EXPIRY (days)',        hint: 'Days before unused stamps expire' },
  { key: 'referralDays',   label: 'REFERRAL EXPIRY (days)',     hint: 'Days before referral rewards expire' },
  { key: 'mysteryBoxDays', label: 'MYSTERY BOX EXPIRY (days)', hint: 'Days before mystery box rewards expire' },
  { key: 'gameWinDays',    label: 'WEEKLY GAME PRIZE (days)',  hint: 'Days a winner has to redeem their prize in store' },
];

export default function ExpirySection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ stampDays: '', referralDays: '', mysteryBoxDays: '', gameWinDays: '' });

  useEffect(() => {
    api.get('/expiry/settings')
      .then(r => {
        // API returns { settings: {...} }, not the fields flat on r.data —
        // this was reading r.data.stampDays etc directly before, which was
        // always undefined, so every field silently loaded blank.
        const set = r.data.settings || {};
        setForm({
          stampDays:      String(set.stampDays || ''),
          referralDays:   String(set.referralDays || ''),
          mysteryBoxDays: String(set.mysteryBoxDays || ''),
          gameWinDays:    String(set.gameWinDays || ''),
        });
      })
      .catch(() => Alert.alert('Error', 'Could not load expiry settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/expiry/settings', {
        stampDays:      form.stampDays ? Number(form.stampDays) : null,
        referralDays:   form.referralDays ? Number(form.referralDays) : null,
        mysteryBoxDays: form.mysteryBoxDays ? Number(form.mysteryBoxDays) : null,
        gameWinDays:    form.gameWinDays ? Number(form.gameWinDays) : null,
      });
      Alert.alert('Saved', 'Expiry settings updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>REWARD EXPIRY SETTINGS</Text>
        <Text style={s.intro}>Set to 0 or leave blank to disable expiry for that reward type.</Text>
        {FIELDS.map(({ key, label, hint }) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            {hint && <Text style={s.hint}>{hint}</Text>}
            <TextInput
              style={s.input}
              value={form[key]}
              onChangeText={set(key)}
              keyboardType="numeric"
              placeholder="0 = no expiry"
              placeholderTextColor={T.textFaint}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>SAVE SETTINGS</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 8 },
  intro: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 },
  hint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 6 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBodyBd, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center' },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
