import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Switch, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TYPES = ['PERCENT', 'FIXED'];
const fmtCcy = (n) => `£${Number(n || 0).toFixed(2)}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return 'No expiry'; const d = new Date(s); return `Expires ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const BLANK = { code: '', type: 'PERCENT', value: '', description: '', maxUses: '', minOrderAmount: '', expiresAt: '', bannerMessage: '' };

export default function PromosSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [promos,   setPromos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/promo'); setPromos(r.data.promos || r.data || []); }
    catch { Alert.alert('Error', 'Could not load promos.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ code: p.code || '', type: p.type || 'PERCENT', value: String(p.value || ''), description: p.description || '', maxUses: p.maxUses != null ? String(p.maxUses) : '', minOrderAmount: p.minOrderAmount != null ? String(p.minOrderAmount) : '', expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : '', bannerMessage: p.bannerMessage || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.value) { Alert.alert('Required', 'Code and value are required.'); return; }
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        description: form.description,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        bannerMessage: form.bannerMessage,
      };
      if (editing) { await api.put(`/promo/${editing.id}`, body); }
      else { await api.post('/promo', body); }
      setShowForm(false); load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = (p) => {
    Alert.alert('Delete Promo', `Remove code "${p.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/promo/${p.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>NEW PROMO CODE</Text>
        </TouchableOpacity>

        {promos.length === 0 && <Text style={s.empty}>No promo codes yet.</Text>}

        {promos.map(p => {
          const expired = p.expiresAt && new Date(p.expiresAt) < new Date();
          return (
            <View key={p.id} style={[s.card, expired && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.code}>{p.code}</Text>
                  {p.description && <Text style={s.desc}>{p.description}</Text>}
                  <Text style={s.meta}>
                    {p.type === 'PERCENT' ? `${p.value}% off` : fmtCcy(p.value) + ' off'}
                    {p.minOrderAmount ? ` · min ${fmtCcy(p.minOrderAmount)}` : ''}
                    {p.maxUses ? ` · max ${p.maxUses} uses` : ''}
                  </Text>
                  <Text style={[s.meta, expired && { color: T.red }]}>{fmtDate(p.expiresAt)}</Text>
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(p)}>
                    <Ionicons name="pencil-outline" size={14} color={T.textDim} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(p)}>
                    <Ionicons name="trash-outline" size={14} color={T.red} />
                  </TouchableOpacity>
                </View>
              </View>
              {p.bannerMessage && (
                <View style={s.bannerRow}>
                  <Ionicons name="megaphone-outline" size={11} color={T.textDim} />
                  <Text style={s.bannerMsg}>{p.bannerMessage}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editing ? 'EDIT PROMO' : 'NEW PROMO'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={20} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>PROMO CODE *</Text>
              <TextInput style={s.input} value={form.code} onChangeText={set('code')} placeholder="e.g. SUMMER20" placeholderTextColor={T.textFaint} autoCapitalize="characters" />

              <Text style={s.fieldLabel}>DISCOUNT TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.typeBtn, form.type === t && s.typeBtnActive]} onPress={() => set('type')(t)} activeOpacity={0.7}>
                    <Text style={[s.typeBtnText, form.type === t && s.typeBtnTextActive]}>{t === 'PERCENT' ? 'Percent (%)' : 'Fixed (£)'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>VALUE *</Text>
              <TextInput style={s.input} value={form.value} onChangeText={set('value')} placeholder={form.type === 'PERCENT' ? 'e.g. 20' : 'e.g. 10.00'} placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />

              <Text style={s.fieldLabel}>DESCRIPTION</Text>
              <TextInput style={s.input} value={form.description} onChangeText={set('description')} placeholder="Internal description" placeholderTextColor={T.textFaint} />

              <Text style={s.fieldLabel}>MAX USES (leave blank for unlimited)</Text>
              <TextInput style={s.input} value={form.maxUses} onChangeText={set('maxUses')} placeholder="e.g. 100" placeholderTextColor={T.textFaint} keyboardType="numeric" />

              <Text style={s.fieldLabel}>MIN ORDER AMOUNT (£)</Text>
              <TextInput style={s.input} value={form.minOrderAmount} onChangeText={set('minOrderAmount')} placeholder="e.g. 30" placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />

              <Text style={s.fieldLabel}>EXPIRY DATE (YYYY-MM-DD)</Text>
              <TextInput style={s.input} value={form.expiresAt} onChangeText={set('expiresAt')} placeholder="e.g. 2025-12-31" placeholderTextColor={T.textFaint} />

              <Text style={s.fieldLabel}>BANNER MESSAGE (optional)</Text>
              <TextInput style={s.input} value={form.bannerMessage} onChangeText={set('bannerMessage')} placeholder="e.g. Use code SUMMER20 for 20% off!" placeholderTextColor={T.textFaint} />

              <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE PROMO</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 12 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  code: { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 2, color: T.text, marginBottom: 4 },
  desc: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textDim, marginBottom: 3 },
  meta: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 1 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border },
  bannerMsg: { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, flex: 1 },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 10, alignItems: 'center' },
  typeBtnActive: { borderColor: T.red, backgroundColor: T.redDim },
  typeBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 0.5, color: T.textDim },
  typeBtnTextActive: { color: T.red },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
