import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

export default function BannersSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [banners,  setBanners]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState('');
  const [page,     setPage]     = useState('all');
  // pong-invite/snake-start are in-app-only placements (PlayScreen,
  // PongInviteScreen) with no website equivalent, so only the generic
  // "App Banner" (page: 'all') — which maps to the same top-banner slot
  // the website also has — gets a real choice of where to show.
  const [platform, setPlatform] = useState('APP');
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [editMsg,  setEditMsg]  = useState('');
  const [editPlatform, setEditPlatform] = useState('APP');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/banners/all-banners');
      setBanners(r.data.data || r.data || []);
    } catch { Alert.alert('Error', 'Could not load banners.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBanner = async () => {
    if (!msg.trim()) return;
    setSaving(true);
    try {
      await api.post('/banners/add-message', {
        message: msg.trim(), isActive: true, page,
        platform: page === 'all' ? platform : 'APP',
      });
      setMsg('');
      load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not create.'); }
    finally { setSaving(false); }
  };

  const choosePage = (value) => {
    setPage(value);
    if (value !== 'all') setPlatform('APP'); // no website equivalent for these placements
  };

  const toggleActive = async (banner) => {
    try {
      await api.put(`/banners/edit-banner/${banner.id}`, { active: !banner.active });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active: !b.active } : b));
    } catch { Alert.alert('Error', 'Could not update.'); }
  };

  const saveEdit = async () => {
    if (!editMsg.trim() || !editing) return;
    setSaving(true);
    try {
      await api.put(`/banners/edit-banner/${editing.id}`, {
        ...editing, message: editMsg.trim(),
        platform: editing.page === 'all' ? editPlatform : 'APP',
      });
      setEditing(null);
      load();
    } catch { Alert.alert('Error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = (banner) => {
    Alert.alert('Delete Banner', 'Remove this banner?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/banners/delete-banner/${banner.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>ADD BANNER</Text>
        <Text style={s.hint}>Choose where this banner will appear, then write the message.</Text>
        <View style={s.pageRow}>
          {[
            { value: 'all',          label: 'App Banner' },
            { value: 'pong-invite',  label: 'Pong Search' },
            { value: 'snake-start',  label: 'Snake Start' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.pageChip, page === opt.value && s.pageChipActive]}
              onPress={() => choosePage(opt.value)}
            >
              <Text style={[s.pageChipTxt, page === opt.value && s.pageChipTxtActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {page === 'all' && (
          <View style={s.pageRow}>
            {[
              { value: 'BOTH',    label: 'Website & App' },
              { value: 'WEBSITE', label: 'Website only' },
              { value: 'APP',     label: 'App only' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.pageChip, platform === opt.value && s.pageChipActive]}
                onPress={() => setPlatform(opt.value)}
              >
                <Text style={[s.pageChipTxt, platform === opt.value && s.pageChipTxtActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput
          style={[s.input, { height: 70, textAlignVertical: 'top' }]}
          value={msg}
          onChangeText={setMsg}
          placeholder={page === 'pong-invite' || page === 'snake-start' ? 'e.g. Get 20% off when you buy a hair product!' : 'e.g. 20% off this weekend only!'}
          placeholderTextColor={T.textFaint}
          multiline
        />
        <TouchableOpacity style={[s.btn, (!msg.trim() || saving) && s.btnDim]} onPress={addBanner} disabled={!msg.trim() || saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <View style={s.row}>
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={s.btnText}>ADD BANNER</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionLabel}>ACTIVE BANNERS ({banners.length})</Text>
      {banners.length === 0 && <Text style={s.empty}>No banners yet.</Text>}

      {banners.map(b => (
        <View key={b.id} style={[s.card, !b.active && s.cardInactive]}>
          {editing?.id === b.id ? (
            <>
              <TextInput
                style={[s.input, { marginBottom: 8 }]}
                value={editMsg}
                onChangeText={setEditMsg}
                multiline
                autoFocus
              />
              {editing.page === 'all' && (
                <View style={[s.pageRow, { marginBottom: 10 }]}>
                  {[
                    { value: 'BOTH',    label: 'Website & App' },
                    { value: 'WEBSITE', label: 'Website only' },
                    { value: 'APP',     label: 'App only' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.pageChip, editPlatform === opt.value && s.pageChipActive]}
                      onPress={() => setEditPlatform(opt.value)}
                    >
                      <Text style={[s.pageChipTxt, editPlatform === opt.value && s.pageChipTxtActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={s.row}>
                <TouchableOpacity style={[s.smBtn, { flex: 1, backgroundColor: T.red }]} onPress={saveEdit} disabled={saving}>
                  <Text style={s.smBtnText}>{saving ? 'SAVING…' : 'SAVE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.smBtn, { flex: 1, borderColor: T.border }]} onPress={() => setEditing(null)}>
                  <Text style={[s.smBtnText, { color: T.textDim }]}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[s.bannerMsg, !b.active && { opacity: 0.5 }]}>{b.message}</Text>
              {b.page && b.page !== 'all' && (
                <View style={s.pageTag}>
                  <Text style={s.pageTagTxt}>
                  {b.page === 'pong-invite' ? 'Pong Search' : b.page === 'snake-start' ? 'Snake Start' : b.page}
                </Text>
                </View>
              )}
              {b.platform && b.platform !== 'BOTH' && (
                <View style={s.pageTag}>
                  <Text style={s.pageTagTxt}>{b.platform === 'APP' ? 'App only' : 'Website only'}</Text>
                </View>
              )}
              <View style={[s.row, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Switch
                    value={!!b.active}
                    onValueChange={() => toggleActive(b)}
                    trackColor={{ true: '#22c55e', false: T.border }}
                    thumbColor={b.active ? '#fff' : T.textFaint}
                  />
                  <Text style={s.activeLabel}>{b.active ? 'Active' : 'Inactive'}</Text>
                </View>
                <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(b); setEditMsg(b.message); setEditPlatform(b.platform || 'APP'); }}>
                  <Ionicons name="pencil-outline" size={14} color={T.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(b)}>
                  <Ionicons name="trash-outline" size={14} color={T.red} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardInactive: { opacity: 0.7 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 10 },
  hint: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 12 },
  sectionLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  bannerMsg: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { backgroundColor: T.red, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnDim: { opacity: 0.4 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  smBtn: { borderWidth: 1, borderColor: T.red, paddingVertical: 8, alignItems: 'center' },
  smBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: '#fff' },
  activeLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 20 },
  pageRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pageChip: { paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: T.border },
  pageChipActive: { borderColor: T.gold, backgroundColor: `${T.gold}18` },
  pageChipTxt: { fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 1, color: T.textDim },
  pageChipTxtActive: { color: T.gold },
  pageTag: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: T.gold, backgroundColor: `${T.gold}12` },
  pageTagTxt: { fontFamily: T.fontBodyMd, fontSize: 9, letterSpacing: 2, color: T.gold, textTransform: 'uppercase' },
}); }
