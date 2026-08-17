import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const TYPES = ['public', 'member'];
const BLANK = { name: '', description: '', price: '', type: 'public' };

// Shared add/edit form for a Service — used by the admin panel's Services
// section and the inline editor on the public Services page.
export default function ServiceFormModal({ visible, editing, onClose, onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [form,   setForm]   = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        name: editing.name || '',
        description: editing.description || '',
        price: editing.price != null ? String(editing.price) : '',
        type: editing.type || 'public',
      });
    } else {
      setForm(BLANK);
    }
  }, [visible, editing]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Service name is required.'); return; }
    setSaving(true);
    try {
      const body = { name: form.name, description: form.description, price: form.price ? Number(form.price) : null, type: form.type };
      if (editing) await api.put(`/services/edit-service/${editing.id}`, body);
      else         await api.post('/services/add-service', body);
      onSaved();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? 'EDIT SERVICE' : 'NEW SERVICE'}</Text>
            <TouchableOpacity onPress={onClose}>
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
  );
}

function makeStyles(T) { return StyleSheet.create({
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
