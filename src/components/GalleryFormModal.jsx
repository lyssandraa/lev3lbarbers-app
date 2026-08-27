import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Pressable, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { resolveImageUrl } from '../config';
import { useTheme } from '../context/ThemeContext';
import { pickImages, assetToFormFile } from '../utils/pickImage';

// Shared create/edit form for a Gallery item (a title/description plus one
// or more photos) — used inline on the public Gallery page.
export default function GalleryFormModal({ visible, editing, onClose, onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [existingImages, setExistingImages] = useState([]); // [{id, imageUrl}] — only when editing
  const [newImages,      setNewImages]      = useState([]); // freshly picked ImagePicker assets
  const [saving,   setSaving]   = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTitle(editing.title || '');
      setDescription(editing.description || '');
      setExistingImages(editing.images || []);
    } else {
      setTitle('');
      setDescription('');
      setExistingImages([]);
    }
    setNewImages([]);
  }, [visible, editing]);

  const addPhotos = async () => {
    const assets = await pickImages({ multiple: true });
    if (assets.length) setNewImages(prev => [...prev, ...assets]);
  };

  const removeNewImage = (idx) => setNewImages(prev => prev.filter((_, i) => i !== idx));

  const removeExistingImage = (img) => {
    Alert.alert('Remove Photo', 'Remove this photo from the item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setRemovingId(img.id);
        try {
          const r = await api.delete(`/gallery/${editing.id}/images/${img.id}`);
          if (r.data?.itemDeleted) { onSaved(); return; }
          setExistingImages(prev => prev.filter(i => i.id !== img.id));
        } catch { Alert.alert('Error', 'Could not remove photo.'); }
        finally { setRemovingId(null); }
      }},
    ]);
  };

  const deleteWholeItem = () => {
    Alert.alert('Delete Item', `Remove "${editing.title}" and all its photos?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/gallery/delete/${editing.id}`); onSaved(); }
        catch { Alert.alert('Error', 'Could not delete item.'); }
      }},
    ]);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    if (!editing && newImages.length === 0) { Alert.alert('Required', 'Add at least one photo.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/gallery/update/${editing.id}`, { title, description });
        if (newImages.length > 0) {
          const fd = new FormData();
          newImages.forEach(a => fd.append('photos', assetToFormFile(a)));
          await api.post(`/gallery/${editing.id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('description', description || '');
        newImages.forEach(a => fd.append('photos', assetToFormFile(a)));
        await api.post('/gallery/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
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
            <Text style={s.sheetTitle}>{editing ? 'EDIT GALLERY ITEM' : 'NEW GALLERY ITEM'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={T.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={s.fieldLabel}>TITLE *</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Skin Fade" placeholderTextColor={T.textFaint} />
            <Text style={s.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Optional description…" placeholderTextColor={T.textFaint} multiline />

            <Text style={s.fieldLabel}>PHOTOS</Text>
            <View style={s.photoGrid}>
              {existingImages.map(img => (
                <View key={img.id} style={s.photoThumbWrap}>
                  <Image source={{ uri: resolveImageUrl(img.imageUrl) }} style={s.photoThumb} resizeMode="cover" />
                  {removingId === img.id ? (
                    <View style={s.photoRemoveBtn}><ActivityIndicator size="small" color="#fff" /></View>
                  ) : (
                    <TouchableOpacity style={s.photoRemoveBtn} onPress={() => removeExistingImage(img)}>
                      <Ionicons name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {newImages.map((asset, i) => (
                <View key={asset.uri + i} style={s.photoThumbWrap}>
                  <Image source={{ uri: asset.uri }} style={s.photoThumb} resizeMode="cover" />
                  <View style={s.photoNewBadge}><Text style={s.photoNewBadgeText}>NEW</Text></View>
                  <TouchableOpacity style={s.photoRemoveBtn} onPress={() => removeNewImage(i)}>
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addPhotoTile} onPress={addPhotos} activeOpacity={0.7}>
                <Ionicons name="add" size={22} color={T.textDim} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{editing ? 'SAVE CHANGES' : 'UPLOAD'}</Text>}
            </TouchableOpacity>

            {editing && (
              <TouchableOpacity style={s.deleteBtn} onPress={deleteWholeItem} activeOpacity={0.8}>
                <Text style={s.deleteBtnText}>DELETE ITEM</Text>
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
  sheetTitle: { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 1, color: T.text, flex: 1, marginRight: 10 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoThumbWrap: { width: 80, height: 80, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  photoNewBadge: { position: 'absolute', bottom: 2, left: 2, backgroundColor: T.red, paddingHorizontal: 4, paddingVertical: 1 },
  photoNewBadgeText: { fontFamily: T.fontBodyBd, fontSize: 7, letterSpacing: 0.5, color: '#fff' },
  addPhotoTile: { width: 80, height: 80, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  deleteBtn: { borderWidth: 1, borderColor: T.red, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.red },
}); }
