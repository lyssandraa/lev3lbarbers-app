import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { resolveImageUrl } from '../../../config';
import { useTheme } from '../../../context/ThemeContext';
import { pickImages, assetToFormFile } from '../../../utils/pickImage';

// Mirrors the website's AdminHeroSlideshow.jsx — same three actions (add,
// set as start slide, remove), same /hero-slideshow/* endpoints.
export default function HeroSlideshowSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [images,   setImages]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/hero-slideshow/public');
      setImages(r.data.images || []);
    } catch { Alert.alert('Error', 'Could not load slideshow images.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSlide = async () => {
    const assets = await pickImages();
    if (!assets.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', assetToFormFile(assets[0]));
      await api.post('/hero-slideshow/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch { Alert.alert('Error', 'Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  const setDefault = async (id) => {
    try { await api.put(`/hero-slideshow/${id}/default`); load(); }
    catch { Alert.alert('Error', 'Could not set as start slide.'); }
  };

  const removeSlide = (id) => {
    Alert.alert('Remove Slide', 'Remove this slide? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/hero-slideshow/${id}`); load(); }
        catch { Alert.alert('Error', 'Could not remove slide.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>HERO SLIDESHOW</Text>
        <Text style={s.intro}>Images cycle every 4 seconds on the home page. Mark one as the start slide — visitors always land on it first.</Text>

        <TouchableOpacity style={[s.addBtn, uploading && s.btnDim]} onPress={addSlide} disabled={uploading} activeOpacity={0.8}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnText}>ADD SLIDE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>CURRENT SLIDES ({images.length})</Text>

      {images.length === 0 ? (
        <Text style={s.emptyText}>No slides yet. Add the first one above.</Text>
      ) : (
        <View style={s.grid}>
          {images.map((img, i) => (
            <View key={img.id} style={s.slideCard}>
              <View style={s.slideNum}><Text style={s.slideNumText}>#{i + 1}</Text></View>
              {img.isDefault && (
                <View style={s.defaultBadge}><Text style={s.defaultBadgeText}>★ START</Text></View>
              )}
              <Image source={{ uri: resolveImageUrl(img.imageUrl) }} style={s.slideImg} resizeMode="cover" />
              <View style={s.cardActions}>
                {!img.isDefault && (
                  <TouchableOpacity style={s.setDefaultBtn} onPress={() => setDefault(img.id)}>
                    <Text style={s.setDefaultText}>Set as start</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.removeBtn} onPress={() => removeSlide(img.id)}>
                  <Ionicons name="trash-outline" size={13} color={T.red} />
                  <Text style={s.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 16 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 8 },
  intro: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 16, lineHeight: 18 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13 },
  btnDim: { opacity: 0.5 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: '#fff' },

  sectionTitle: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 10 },
  emptyText: { fontFamily: T.fontBody, fontSize: 13, color: T.textFaint, fontStyle: 'italic' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slideCard: { width: '47%', borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, position: 'relative', overflow: 'hidden' },
  slideNum: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
  slideNumText: { fontFamily: T.fontBodyBd, fontSize: 9, color: '#fff' },
  defaultBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: T.red, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
  defaultBadgeText: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 0.5, color: '#fff' },
  slideImg: { width: '100%', aspectRatio: 16 / 9, backgroundColor: T.card },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: T.border },
  setDefaultBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRightWidth: 1, borderRightColor: T.border },
  setDefaultText: { fontFamily: T.fontBodyBd, fontSize: 10, color: T.text },
  removeBtn: { flex: 1, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  removeText: { fontFamily: T.fontBodyBd, fontSize: 10, color: T.red },
}); }
