import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = ['Settings', 'Referrals'];
const REWARD_TYPES = ['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_SERVICE', 'NONE'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export default function ReferralsSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [tab, setTab] = useState('Settings');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'Settings' && <SettingsTab T={T} s={s} />}
      {tab === 'Referrals' && <ReferralList T={T} s={s} />}
    </View>
  );
}

function SettingsTab({ T, s }) {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ isActive: false, reward1Type: 'NONE', reward1: '', reward2Type: 'NONE', reward2: '', reward3Type: 'NONE', reward3: '' });

  useEffect(() => {
    api.get('/referrals/settings')
      .then(r => setForm({ isActive: r.data.isActive || false, reward1Type: r.data.reward1Type || 'NONE', reward1: r.data.reward1 || '', reward2Type: r.data.reward2Type || 'NONE', reward2: r.data.reward2 || '', reward3Type: r.data.reward3Type || 'NONE', reward3: r.data.reward3 || '' }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/referrals/settings', form);
      Alert.alert('Saved', 'Referral settings updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>REFERRAL SYSTEM</Text>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>{form.isActive ? 'Referrals ACTIVE' : 'Referrals INACTIVE'}</Text>
          </View>
          <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ true: '#22c55e', false: T.border }} thumbColor={form.isActive ? '#fff' : T.textFaint} />
        </View>
      </View>

      {[[1, 'reward1Type', 'reward1', 'After 1st referral'], [2, 'reward2Type', 'reward2', 'After 3rd referral'], [3, 'reward3Type', 'reward3', 'After 5th referral']].map(([num, typeKey, valKey, desc]) => (
        <View key={num} style={s.card}>
          <Text style={s.cardLabel}>MILESTONE {num} — {desc.toUpperCase()}</Text>
          <Text style={s.fieldLabel}>REWARD TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {REWARD_TYPES.map(rt => (
              <TouchableOpacity key={rt} style={[s.chip, form[typeKey] === rt && s.chipActive]} onPress={() => set(typeKey)(rt)} activeOpacity={0.7}>
                <Text style={[s.chipText, form[typeKey] === rt && s.chipTextActive]}>{rt.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {form[typeKey] !== 'NONE' && (
            <>
              <Text style={s.fieldLabel}>REWARD VALUE</Text>
              <TextInput style={s.input} value={form[valKey]} onChangeText={set(valKey)} placeholder={form[typeKey] === 'DISCOUNT_PERCENT' ? 'e.g. 10 (%)' : form[typeKey] === 'DISCOUNT_FIXED' ? 'e.g. 5.00 (£)' : 'e.g. Free haircut'} placeholderTextColor={T.textFaint} />
            </>
          )}
        </View>
      ))}

      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>SAVE SETTINGS</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ReferralList({ T, s }) {
  const [referrals, setReferrals] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.get('/referrals/all')
      .then(r => setReferrals(r.data.referrals || []))
      .catch(() => Alert.alert('Error', 'Could not load referrals.'))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS = { PENDING: '#f59e0b', COMPLETE: '#22c55e', EXPIRED: T.textDim };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={referrals}
      keyExtractor={r => String(r.id)}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      ListEmptyComponent={<Text style={s.empty}>No referrals yet.</Text>}
      renderItem={({ item: r }) => {
        const col = STATUS_COLORS[r.status] || T.textDim;
        return (
          <View style={s.refRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.refReferrer}>{r.referrer?.name || '—'}</Text>
              <Text style={s.refMeta}>Referred: {r.refereeEmail}</Text>
              <Text style={s.refDate}>{fmtDate(r.createdAt)}</Text>
            </View>
            <View style={[s.statusChip, { backgroundColor: col + '22' }]}>
              <Text style={[s.statusText, { color: col }]}>{r.status}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

function makeStyles(T) { return StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: T.red },
  tabLabel: { fontFamily: T.fontHead, fontSize: 11, letterSpacing: 2, color: T.textDim },
  tabLabelActive: { color: T.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.border, marginRight: 8 },
  chipActive: { borderColor: T.red, backgroundColor: T.redDim },
  chipText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 0.5, color: T.textDim },
  chipTextActive: { color: T.red },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  refReferrer: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, marginBottom: 2 },
  refMeta: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 1 },
  refDate: { fontFamily: T.fontBody, fontSize: 10, color: T.textFaint },
  statusChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1 },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
}); }
