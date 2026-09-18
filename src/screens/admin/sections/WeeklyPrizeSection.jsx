import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

export default function WeeklyPrizeSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [prize,     setPrize]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [expiresAt, setExpiresAt] = useState(null); // current saved expiry, from server
  const [daysInput, setDaysInput] = useState('');    // days-from-now, entered fresh each save

  useEffect(() => {
    api.get('/scores/prize')
      .then(r => {
        setPrize(r.data.prize || '');
        setDesc(r.data.description || '');
        setExpiresAt(r.data.expiresAt || null);
      })
      .catch(() => Alert.alert('Error', 'Could not load prize.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const days = parseInt(daysInput, 10);
      const body = { prize: prize.trim(), description: desc.trim() || null };
      // Only touch expiry if a days value was actually entered this time —
      // otherwise leave whatever expiry is already saved untouched.
      if (daysInput.trim() !== '') {
        body.expiresAt = Number.isFinite(days) && days > 0
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null; // 0 or invalid clears the expiry
      } else {
        body.expiresAt = expiresAt;
      }
      const res = await api.put('/scores/prize', body);
      setExpiresAt(res.data.expiresAt || null);
      setDaysInput('');
      Alert.alert('Saved', 'Weekly prize updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const clearExpiry = async () => {
    setSaving(true);
    try {
      const res = await api.put('/scores/prize', { prize: prize.trim(), description: desc.trim() || null, expiresAt: null });
      setExpiresAt(res.data.expiresAt || null);
      setDaysInput('');
    } catch {
      Alert.alert('Error', 'Could not clear expiration.');
    } finally {
      setSaving(false);
    }
  };

  const daysUntil = expiresAt ? Math.ceil((new Date(expiresAt) - Date.now()) / 86400000) : null;

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.wrap}>
      <View style={s.hint}>
        <Ionicons name="information-circle-outline" size={15} color={T.textDim} />
        <Text style={s.hintTxt}>
          Whatever you write here appears on the Play screen as the weekly prize, and
          is included in the winner's congratulations email every Monday.
        </Text>
      </View>

      <Text style={s.label}>PRIZE THIS WEEK</Text>
      <TextInput
        style={s.input}
        value={prize}
        onChangeText={setPrize}
        placeholder="e.g. Free Haircut"
        placeholderTextColor={T.textFaint}
        maxLength={80}
      />

      <Text style={s.label}>DESCRIPTION (optional)</Text>
      <TextInput
        style={[s.input, s.inputMulti]}
        value={desc}
        onChangeText={setDesc}
        placeholder="e.g. Redeem at the counter — valid for one visit"
        placeholderTextColor={T.textFaint}
        multiline
        maxLength={200}
      />

      <Text style={s.label}>EXPIRATION (optional)</Text>
      <Text style={s.expiryStatus}>
        {expiresAt
          ? daysUntil > 0
            ? `Currently expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${new Date(expiresAt).toLocaleDateString()})`
            : 'Already expired'
          : 'No expiration set — runs on the normal weekly cycle only'}
      </Text>
      <View style={s.expiryRow}>
        <TextInput
          style={[s.input, s.expiryInput]}
          value={daysInput}
          onChangeText={setDaysInput}
          placeholder="e.g. 7"
          placeholderTextColor={T.textFaint}
          keyboardType="numeric"
        />
        <Text style={s.expiryInputLabel}>days from now</Text>
      </View>
      {!!expiresAt && (
        <TouchableOpacity onPress={clearExpiry} disabled={saving}>
          <Text style={s.clearExpiryLink}>Clear expiration</Text>
        </TouchableOpacity>
      )}

      {/* Live preview */}
      <View style={s.previewCard}>
        <Ionicons name="trophy" size={18} color={T.gold} />
        <View style={{ flex: 1 }}>
          <Text style={s.previewTitle}>WEEKLY WINNER PRIZE</Text>
          <Text style={s.previewSub} numberOfLines={2}>
            {prize.trim()
              ? `Participate to win: ${prize.trim()}`
              : 'The top player each Sunday earns a reward. Claim in store.'}
          </Text>
        </View>
      </View>
      <Text style={s.previewHint}>↑ Preview of Play screen card</Text>

      <TouchableOpacity
        style={[s.btn, saving && s.btnDim]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.btnTxt}>SAVE PRIZE</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  wrap:  { padding: 16, paddingBottom: 40 },
  hint:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 20,
           paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  hintTxt: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, flex: 1 },

  label: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim,
           textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
           paddingHorizontal: 14, paddingVertical: 12,
           fontFamily: T.fontBody, fontSize: 15, color: T.text },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 12 },

  expiryStatus: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 8 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expiryInput: { width: 80 },
  expiryInputLabel: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim },
  clearExpiryLink: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.red, marginTop: 8 },

  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 14,
                 padding: 14, marginTop: 20,
                 backgroundColor: T.surface, borderWidth: 1, borderColor: T.goldDim || T.gold },
  previewTitle:{ fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.gold,
                 textTransform: 'uppercase', marginBottom: 3 },
  previewSub:  { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 17 },
  previewHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginTop: 6, marginBottom: 20 },

  btn:    { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnDim: { opacity: 0.5 },
  btnTxt: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
