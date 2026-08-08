import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = ['Hours', 'Info'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DEFAULT_HOURS = Object.fromEntries(DAY_KEYS.map(d => [d, { closed: false, open: '09:00', close: '18:00' }]));

export default function ShopSettingsSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [tab, setTab] = useState('Hours');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'Hours' && <HoursTab T={T} s={s} />}
      {tab === 'Info'  && <InfoTab  T={T} s={s} />}
    </View>
  );
}

function HoursTab({ T, s }) {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [hours,   setHours]   = useState(DEFAULT_HOURS);

  useEffect(() => {
    api.get('/shop-status')
      .then(r => {
        const h = r.data.openingHours;
        if (h) setHours({ ...DEFAULT_HOURS, ...h });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setDay = (day, field, val) => setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/shop-status', { openingHours: hours });
      Alert.alert('Saved', 'Opening hours updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {DAY_KEYS.map(day => {
        const d = hours[day] || { closed: false, open: '09:00', close: '18:00' };
        return (
          <View key={day} style={[s.dayCard, d.closed && s.dayCardClosed]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: d.closed ? 0 : 10 }}>
              <Text style={s.dayName}>{DAY_NAMES[day]}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[s.closedLabel, d.closed && { color: T.red }]}>{d.closed ? 'CLOSED' : 'OPEN'}</Text>
              <Switch
                value={!d.closed}
                onValueChange={v => setDay(day, 'closed', !v)}
                trackColor={{ true: '#22c55e', false: T.border }}
                thumbColor={!d.closed ? '#fff' : T.textFaint}
                style={{ marginLeft: 8 }}
              />
            </View>
            {!d.closed && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.timeLabel}>OPENS</Text>
                  <TextInput style={s.timeInput} value={d.open} onChangeText={v => setDay(day, 'open', v)} placeholder="09:00" placeholderTextColor={T.textFaint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.timeLabel}>CLOSES</Text>
                  <TextInput style={s.timeInput} value={d.close} onChangeText={v => setDay(day, 'close', v)} placeholder="18:00" placeholderTextColor={T.textFaint} />
                </View>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE HOURS</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoTab({ T, s }) {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ address: '', city: '', postcode: '', phone: '', email: '', instagram: '', mapEmbedUrl: '', servicesTitle: '', servicesIntro: '' });

  useEffect(() => {
    api.get('/shop-info')
      .then(r => setForm({ address: r.data.address || '', city: r.data.city || '', postcode: r.data.postcode || '', phone: r.data.phone || '', email: r.data.email || '', instagram: r.data.instagram || '', mapEmbedUrl: r.data.mapEmbedUrl || '', servicesTitle: r.data.servicesTitle || '', servicesIntro: r.data.servicesIntro || '' }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/shop-info', form);
      Alert.alert('Saved', 'Shop info updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {[
        { key: 'address',      label: 'ADDRESS' },
        { key: 'city',         label: 'CITY' },
        { key: 'postcode',     label: 'POSTCODE' },
        { key: 'phone',        label: 'PHONE' },
        { key: 'email',        label: 'EMAIL' },
        { key: 'instagram',    label: 'INSTAGRAM HANDLE' },
        { key: 'mapEmbedUrl',  label: 'MAP EMBED URL' },
      ].map(f => (
        <View key={f.key}>
          <Text style={s.fieldLabel}>{f.label}</Text>
          <TextInput style={s.input} value={form[f.key]} onChangeText={set(f.key)} placeholderTextColor={T.textFaint} autoCapitalize="none" />
        </View>
      ))}
      <Text style={s.fieldLabel}>SERVICES PAGE TITLE</Text>
      <TextInput style={s.input} value={form.servicesTitle} onChangeText={set('servicesTitle')} placeholder="Our Services" placeholderTextColor={T.textFaint} />

      <Text style={s.fieldLabel}>SERVICES INTRO</Text>
      <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={form.servicesIntro} onChangeText={set('servicesIntro')} placeholder="Intro text shown on services page…" placeholderTextColor={T.textFaint} multiline />

      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE INFO</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
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
  dayCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  dayCardClosed: { opacity: 0.7 },
  dayName: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.text },
  closedLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: '#22c55e' },
  timeLabel: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 },
  timeInput: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBodyBd, fontSize: 14, paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center' },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
