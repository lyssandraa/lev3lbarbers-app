import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const REWARD_TYPES = ['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_SERVICE', 'MYSTERY_BOX', 'CUSTOM', 'NONE'];
const TIER_COLORS = { BRONZE: '#d4a853', SILVER: '#8a93a3', GOLD: '#caa400', PLATINUM: '#7d8aa8' };

const LEVELS = [
  { num: 1, key: 'level1Type', valKey: 'level1Value', tier: 'BRONZE',   label: 'Level 1 — Bronze' },
  { num: 2, key: 'level2Type', valKey: 'level2Value', tier: 'SILVER',   label: 'Level 2 — Silver' },
  { num: 3, key: 'level3Type', valKey: 'level3Value', tier: 'GOLD',     label: 'Level 3 — Gold' },
  { num: 4, key: 'level4Type', valKey: 'level4Value', tier: 'PLATINUM', label: 'Level 4 — Platinum' },
];

export default function BirthdaySection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({ isActive: false, level1Type: 'NONE', level1Value: '', level2Type: 'NONE', level2Value: '', level3Type: 'NONE', level3Value: '', level4Type: 'NONE', level4Value: '' });

  useEffect(() => {
    api.get('/birthday/settings')
      .then(r => {
        const d = r.data;
        setForm({ isActive: d.isActive || false, level1Type: d.level1Type || 'NONE', level1Value: d.level1Value || '', level2Type: d.level2Type || 'NONE', level2Value: d.level2Value || '', level3Type: d.level3Type || 'NONE', level3Value: d.level3Value || '', level4Type: d.level4Type || 'NONE', level4Value: d.level4Value || '' });
      })
      .catch(() => Alert.alert('Error', 'Could not load birthday settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/birthday/settings', form);
      Alert.alert('Saved', 'Birthday reward settings updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>BIRTHDAY REWARDS</Text>
        <Text style={s.hint}>Members receive a birthday reward based on their tier during their birthday window.</Text>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>{form.isActive ? 'Birthday Rewards ACTIVE' : 'Birthday Rewards INACTIVE'}</Text>
          </View>
          <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ true: '#22c55e', false: T.border }} thumbColor={form.isActive ? '#fff' : T.textFaint} />
        </View>
      </View>

      {LEVELS.map(({ key, valKey, tier, label }) => {
        const col = TIER_COLORS[tier];
        return (
          <View key={key} style={[s.levelCard, { borderTopColor: col }]}>
            <Text style={[s.levelLabel, { color: col }]}>{label.toUpperCase()}</Text>

            <Text style={s.fieldLabel}>REWARD TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {REWARD_TYPES.map(rt => (
                <TouchableOpacity key={rt} style={[s.chip, form[key] === rt && s.chipActive]} onPress={() => set(key)(rt)} activeOpacity={0.7}>
                  <Text style={[s.chipText, form[key] === rt && s.chipTextActive]}>{rt.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {form[key] !== 'NONE' && form[key] !== 'MYSTERY_BOX' && (
              <>
                <Text style={s.fieldLabel}>REWARD VALUE</Text>
                <TextInput
                  style={s.input}
                  value={form[valKey]}
                  onChangeText={set(valKey)}
                  placeholder={form[key] === 'DISCOUNT_PERCENT' ? 'e.g. 15 (%)' : form[key] === 'DISCOUNT_FIXED' ? 'e.g. 10.00 (£)' : 'e.g. Free beard trim'}
                  placeholderTextColor={T.textFaint}
                />
              </>
            )}
          </View>
        );
      })}

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
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 10 },
  hint: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  levelCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 14, marginBottom: 10 },
  levelLabel: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.border, marginRight: 8 },
  chipActive: { borderColor: T.red, backgroundColor: T.redDim },
  chipText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 0.5, color: T.textDim },
  chipTextActive: { color: T.red },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center' },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
