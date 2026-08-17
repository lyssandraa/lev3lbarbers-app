import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Pressable, ScrollView, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { BACKEND } from '../config';
import { useTheme } from '../context/ThemeContext';
import { pickImages, assetToFormFile } from '../utils/pickImage';

const CATEGORIES = ['online', 'in-shop'];
const BLANK = { name: '', description: '', price: '', priceHidden: false, category: 'online', trackStock: false, stock: '' };

// Shared add/edit form for a Shop product — used inline on the public Shop
// page.
export default function ShopProductFormModal({ visible, editing, onClose, onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [form,  setForm]  = useState(BLANK);
  const [image, setImage] = useState(null); // freshly picked asset, replaces existing image on save
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        name: editing.name || '',
        description: editing.description || '',
        price: editing.price != null ? String(editing.price) : '',
        priceHidden: !!editing.priceHidden,
        category: editing.category || 'online',
        trackStock: !!editing.trackStock,
        stock: editing.stock != null ? String(editing.stock) : '',
      });
    } else {
      setForm(BLANK);
    }
    setImage(null);
  }, [visible, editing]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const pickPhoto = async () => {
    const assets = await pickImages({ multiple: false });
    if (assets.length) setImage(assets[0]);
  };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description || '');
      fd.append('price', form.price || '');
      fd.append('priceHidden', String(form.priceHidden));
      fd.append('category', form.category);
      fd.append('trackStock', String(form.trackStock));
      fd.append('stock', form.trackStock ? (form.stock || '') : '');
      if (image) fd.append('image', assetToFormFile(image));

      if (editing) await api.put(`/shop-products/update/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else         await api.post('/shop-products/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const remove = () => {
    Alert.alert('Delete Product', `Remove "${editing.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/shop-products/delete/${editing.id}`); onSaved(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const photoUri = image ? image.uri : (editing?.imageUrl ? `${BACKEND}${editing.imageUrl}` : null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={T.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <TouchableOpacity style={s.photoTile} onPress={pickPhoto} activeOpacity={0.8}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.photoImg} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={26} color={T.textFaint} />
              )}
              <View style={s.photoEditBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>NAME *</Text>
            <TextInput style={s.input} value={form.name} onChangeText={set('name')} placeholder="e.g. LEV3L Cap" placeholderTextColor={T.textFaint} />
            <Text style={s.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Optional description…" placeholderTextColor={T.textFaint} multiline />
            <Text style={s.fieldLabel}>PRICE (£)</Text>
            <TextInput style={s.input} value={form.price} onChangeText={set('price')} placeholder="e.g. 20" placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />

            <Text style={s.fieldLabel}>CATEGORY</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[s.catChip, form.category === c && s.catChipActive]} onPress={() => set('category')(c)} activeOpacity={0.7}>
                  <Text style={[s.catChipText, form.category === c && s.catChipTextActive]}>{c === 'online' ? 'ONLINE' : 'IN SHOP'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Members-only pricing</Text>
              <Switch value={form.priceHidden} onValueChange={set('priceHidden')} trackColor={{ true: T.red, false: T.border }} thumbColor={form.priceHidden ? '#fff' : T.textFaint} />
            </View>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Track stock</Text>
              <Switch value={form.trackStock} onValueChange={set('trackStock')} trackColor={{ true: T.red, false: T.border }} thumbColor={form.trackStock ? '#fff' : T.textFaint} />
            </View>
            {form.trackStock && (
              <>
                <Text style={s.fieldLabel}>STOCK COUNT</Text>
                <TextInput style={s.input} value={form.stock} onChangeText={set('stock')} placeholder="e.g. 10" placeholderTextColor={T.textFaint} keyboardType="number-pad" />
              </>
            )}

            <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE PRODUCT</Text>}
            </TouchableOpacity>

            {editing && (
              <TouchableOpacity style={s.deleteBtn} onPress={remove} activeOpacity={0.8}>
                <Text style={s.deleteBtnText}>DELETE PRODUCT</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(T) { return StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },

  photoTile: { width: 100, height: 100, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoEditBadge: { position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },

  catChip: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 10, alignItems: 'center' },
  catChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  catChipText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: T.textDim },
  catChipTextActive: { color: T.red },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.text },

  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  deleteBtn: { borderWidth: 1, borderColor: T.red, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.red },
}); }
