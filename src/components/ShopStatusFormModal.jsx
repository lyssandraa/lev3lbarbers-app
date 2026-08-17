import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Switch, Alert, ActivityIndicator, Modal, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

// Shared shop-status form body — used both embedded full-page in the admin
// panel's Shop Status section, and inside a modal for the inline editor on
// Home, since this is the single most-updated setting during a shift
// (open/closed, wait time, who's in).
export function ShopStatusForm({ onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [isOpen,   setIsOpen]   = useState(false);
  const [override, setOverride] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [barbers,  setBarbers]  = useState(['', '', '']);

  useEffect(() => {
    api.get('/shop-status')
      .then(r => {
        const d = r.data;
        setIsOpen(d.isOpen ?? false);
        setOverride(d.override ?? false);
        setWaitTime(d.waitTime ?? 0);
        setBarbers([(d.barbers?.[0] || ''), (d.barbers?.[1] || ''), (d.barbers?.[2] || '')]);
      })
      .catch(() => Alert.alert('Error', 'Could not load shop status.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/shop-status', {
        isOpen, override,
        barbers: barbers.filter(Boolean),
        waitTime: Number(waitTime),
      });
      onSaved?.();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const adj = (d) => setWaitTime(p => Math.max(0, Number(p) + d));

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>OPEN / CLOSED</Text>
        <View style={s.openRow}>
          <TouchableOpacity
            style={[s.statusBtn, isOpen && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]}
            onPress={() => { setIsOpen(true); setOverride(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color={isOpen ? '#fff' : T.textDim} />
            <Text style={[s.statusBtnText, isOpen && { color: '#fff' }]}>OPEN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.statusBtn, !isOpen && { backgroundColor: T.red, borderColor: T.red }]}
            onPress={() => { setIsOpen(false); setOverride(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={20} color={!isOpen ? '#fff' : T.textDim} />
            <Text style={[s.statusBtnText, !isOpen && { color: '#fff' }]}>CLOSED</Text>
          </TouchableOpacity>
        </View>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Override auto-schedule</Text>
          <Switch
            value={override}
            onValueChange={setOverride}
            trackColor={{ true: T.red, false: T.border }}
            thumbColor={override ? '#fff' : T.textFaint}
          />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>WAIT TIME</Text>
        <View style={s.waitRow}>
          <TouchableOpacity style={s.waitBtn} onPress={() => adj(-10)}><Text style={s.waitBtnText}>−10</Text></TouchableOpacity>
          <TouchableOpacity style={s.waitBtn} onPress={() => adj(-5)}><Text style={s.waitBtnText}>−5</Text></TouchableOpacity>
          <View style={s.waitDisplay}>
            <Text style={s.waitNum}>{waitTime}</Text>
            <Text style={s.waitUnit}>min</Text>
          </View>
          <TouchableOpacity style={s.waitBtn} onPress={() => adj(5)}><Text style={s.waitBtnText}>+5</Text></TouchableOpacity>
          <TouchableOpacity style={s.waitBtn} onPress={() => adj(10)}><Text style={s.waitBtnText}>+10</Text></TouchableOpacity>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>BARBERS IN TODAY</Text>
        <Text style={s.help}>Leave blank if not in.</Text>
        {[0, 1, 2].map(i => (
          <View key={i} style={s.barberRow}>
            <View style={s.barberNum}><Text style={s.barberNumText}>{i + 1}</Text></View>
            <TextInput
              style={s.barberInput}
              value={barbers[i]}
              onChangeText={t => setBarbers(p => { const n = [...p]; n[i] = t; return n; })}
              placeholder={`Barber ${i + 1} name`}
              placeholderTextColor={T.textFaint}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE STATUS</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Bottom-sheet wrapper around the form, for triggering it from outside the
// admin panel (e.g. inline on Home).
export default function ShopStatusFormModal({ visible, onClose, onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>SHOP STATUS</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={T.text} />
            </TouchableOpacity>
          </View>
          {visible && <ShopStatusForm onSaved={onSaved} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(T) { return StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },

  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 12 },
  help: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 12 },
  openRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.card },
  statusBtnText: { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 3, color: T.textDim },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border, backgroundColor: T.card },
  waitBtnText: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.text },
  waitDisplay: { flex: 1.4, alignItems: 'center' },
  waitNum: { fontFamily: T.fontHead, fontSize: 36, letterSpacing: 1, color: T.text, lineHeight: 38 },
  waitUnit: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim },
  barberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  barberNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  barberNumText: { fontFamily: T.fontBodyBd, fontSize: 12, color: '#fff' },
  barberInput: { flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
