import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TYPES = ['public', 'member'];
const fmtPrice = (p) => p != null ? `£${Number(p).toFixed(2)}` : '—';

export default function ServicesSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name: '', description: '', price: '', type: 'public' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/services/all-services');
      setServices(r.data.allServices || []);
    } catch { Alert.alert('Error', 'Could not load services.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', price: '', type: 'public' }); setShowForm(true); };
  const openEdit = (svc) => { setEditing(svc); setForm({ name: svc.name || '', description: svc.description || '', price: svc.price != null ? String(svc.price) : '', type: svc.type || 'public' }); setShowForm(true); };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    setSaving(true);
    try {
      const body = { name: form.name, description: form.description, price: form.price ? Number(form.price) : null, type: form.type };
      if (editing) {
        await api.put(`/services/edit-service/${editing.id}`, body);
      } else {
        await api.post('/services/add-service', body);
      }
      setShowForm(false);
      load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = (svc) => {
    Alert.alert('Delete Service', `Remove "${svc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/services/delete-service/${svc.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const public_svcs = services.filter(s => s.type === 'public');
  const member_svcs = services.filter(s => s.type === 'member');

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>ADD SERVICE</Text>
        </TouchableOpacity>

        {[['PUBLIC SERVICES', public_svcs], ['MEMBER SERVICES', member_svcs]].map(([label, list]) => (
          list.length > 0 && (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={s.groupLabel}>{label}</Text>
              {list.map(svc => (
                <View key={svc.id} style={s.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.svcName}>{svc.name}</Text>
                      {svc.description && <Text style={s.svcDesc} numberOfLines={2}>{svc.description}</Text>}
                    </View>
                    <Text style={s.svcPrice}>{fmtPrice(svc.price)}</Text>
                  </View>
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(svc)}>
                      <Ionicons name="pencil-outline" size={15} color={T.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(svc)}>
                      <Ionicons name="trash-outline" size={15} color={T.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editing ? 'EDIT SERVICE' : 'NEW SERVICE'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={20} color={T.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>NAME *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Classic Haircut" placeholderTextColor={T.textFaint} />
              <Text style={s.fieldLabel}>DESCRIPTION</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Optional description…" placeholderTextColor={T.textFaint} multiline />
              <Text style={s.fieldLabel}>PRICE (£)</Text>
              <TextInput style={s.input} value={form.price} onChangeText={set('price')} placeholder="e.g. 25" placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />
              <Text style={s.fieldLabel}>TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.typeChip, form.type === t && s.typeChipActive]} onPress={() => set('type')(t)} activeOpacity={0.7}>
                    <Text style={[s.typeChipText, form.type === t && s.typeChipTextActive]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.typeHint}>{form.type === 'member' ? 'Visible only to logged-in members with price.' : 'Visible to all users (price shown to members only).'}</Text>
              <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE SERVICE</Text>}
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
  groupLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  svcName: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, marginBottom: 3 },
  svcDesc: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18 },
  svcPrice: { fontFamily: T.fontHead, fontSize: 18, color: T.gold, letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  iconBtn: { width: 34, height: 34, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 14 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  typeChip: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 10, alignItems: 'center' },
  typeChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  typeChipText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: T.textDim },
  typeChipTextActive: { color: T.red },
  typeHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 14 },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
