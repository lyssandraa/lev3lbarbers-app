import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const FIELDS = [
  { key: 'cycleLength',         label: 'STAMP CYCLE LENGTH',       hint: 'Stamps needed to complete one cycle (earn reward)' },
  { key: 'rewardInterval',      label: 'REWARD INTERVAL',          hint: 'Award a reward every N cycles' },
  { key: 'birthdayWindowDays',  label: 'BIRTHDAY WINDOW (days)',   hint: 'Days before/after birthday to award birthday reward' },
  { key: 'bronzeMax',           label: 'BRONZE MAX STAMPS',        hint: 'Total stamps to upgrade from Bronze' },
  { key: 'silverMax',           label: 'SILVER MAX STAMPS',        hint: 'Total stamps to upgrade from Silver' },
  { key: 'goldMax',             label: 'GOLD MAX STAMPS',          hint: 'Total stamps to upgrade from Gold (Platinum after)' },
  { key: 'silverDiscount',      label: 'SILVER DISCOUNT (%)',      hint: 'Discount percentage for Silver members' },
  { key: 'goldDiscount',        label: 'GOLD DISCOUNT (%)',        hint: 'Discount percentage for Gold members' },
  { key: 'platinumDiscount',    label: 'PLATINUM DISCOUNT (%)',    hint: 'Discount percentage for Platinum members' },
];

export default function LoyaltySection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get('/loyalty-settings/settings')
      .then(r => {
        const d = r.data;
        const f = {};
        FIELDS.forEach(({ key }) => { f[key] = d[key] != null ? String(d[key]) : ''; });
        setForm(f);
      })
      .catch(() => Alert.alert('Error', 'Could not load loyalty settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {};
      FIELDS.forEach(({ key }) => { if (form[key] !== '') body[key] = Number(form[key]); });
      await api.put('/loyalty-settings/settings', body);
      Alert.alert('Saved', 'Loyalty settings updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>LOYALTY SYSTEM SETTINGS</Text>
        {FIELDS.map(({ key, label, hint }) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            {hint && <Text style={s.hint}>{hint}</Text>}
            <TextInput
              style={s.input}
              value={form[key] || ''}
              onChangeText={set(key)}
              keyboardType="decimal-pad"
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
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 16 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 },
  hint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 6, lineHeight: 16 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBodyBd, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center' },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
