import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  Modal, Dimensions, PanResponder, ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { resolveImageUrl } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import GalleryFormModal from '../../components/GalleryFormModal';

const { width: W, height: H } = Dimensions.get('window');

const COLS = 2;
const IMG_SIZE = (W - 3) / COLS;

function FadeInItem({ index, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export default function GalleryScreen({ navigation }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const { isAdmin } = useAuth();
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lightbox, setLightbox] = useState(null); // { item, imgIdx }
  const [showForm,   setShowForm]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/gallery/photos')
      .then(r => setItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditingItem(null); setShowForm(true); };
  const openEdit = (item) => { setEditingItem(item); setShowForm(true); };
  const onSaved  = () => { setShowForm(false); load(); };

  // Swipe gesture for lightbox
  const pan = useRef(null);
  useEffect(() => {
    pan.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60 || g.vx < -0.5) moveLightbox(1);
        else if (g.dx > 60 || g.vx > 0.5) moveLightbox(-1);
      },
    });
  }, [lightbox]);

  const moveLightbox = (dir) => {
    setLightbox(prev => {
      if (!prev) return null;
      const total = prev.item.images.length;
      if (total < 2) return prev;
      return { ...prev, imgIdx: (prev.imgIdx + dir + total) % total };
    });
  };

  const renderItem = ({ item, index }) => {
    const thumb = item.images?.[0];
    if (!thumb) return null;
    return (
      <FadeInItem index={index}>
        <TouchableOpacity onPress={() => setLightbox({ item, imgIdx: 0 })} activeOpacity={0.85}>
          <Image
            source={{ uri: resolveImageUrl(thumb.imageUrl) }}
            style={s.thumb}
            resizeMode="cover"
          />
          {item.images.length > 1 && (
            <View style={s.multiDot}>
              <Text style={s.multiDotText}>+{item.images.length}</Text>
            </View>
          )}
          {isAdmin && (
            <TouchableOpacity style={s.editDot} onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </FadeInItem>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <Animated.View
        style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}
      >
        {navigation?.canGoBack?.() && (
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>THE WORK</Text>
            <Text style={s.title}>Gallery</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={s.addPhotosBtn} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addPhotosBtnText}>ADD PHOTOS</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.rule} />
        <Text style={s.sub}>Every cut tells a story.</Text>
      </Animated.View>

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="cut-outline" size={40} color={T.gold} style={{ marginBottom: 14 }} />
          <Text style={s.emptyTitle}>Nothing here yet.</Text>
          <Text style={s.emptyText}>Check back soon — the portfolio is coming.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={it => String(it.id)}
          numColumns={COLS}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          columnWrapperStyle={{ gap: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={s.lbBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setLightbox(null)} />

          {lightbox && (
            <View style={s.lbInner} {...(pan.current?.panHandlers || {})}>
              <Image
                source={{ uri: resolveImageUrl(lightbox.item.images[lightbox.imgIdx]?.imageUrl) }}
                style={s.lbImg}
                resizeMode="contain"
              />

              {/* Title + index */}
              <View style={s.lbMeta}>
                <Text style={s.lbTitle}>{lightbox.item.title}</Text>
                {lightbox.item.images.length > 1 && (
                  <Text style={s.lbIndex}>
                    {lightbox.imgIdx + 1} / {lightbox.item.images.length}
                  </Text>
                )}
              </View>

              {/* Prev / Next */}
              {lightbox.item.images.length > 1 && (
                <>
                  <TouchableOpacity style={[s.lbArrow, { left: 12 }]} onPress={() => moveLightbox(-1)}>
                    <Text style={s.lbArrowText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.lbArrow, { right: 12 }]} onPress={() => moveLightbox(1)}>
                    <Text style={s.lbArrowText}>›</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Close */}
              <TouchableOpacity style={s.lbClose} onPress={() => setLightbox(null)}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {isAdmin && (
        <GalleryFormModal
          visible={showForm}
          editing={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },

  backBtn:{ marginBottom: 10 },
  backText:{ fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, letterSpacing: 1 },
  header: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20 },
  eyebrow:{ fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 4 },
  title:  { fontFamily: T.fontHead, fontSize: 52, letterSpacing: -0.5, lineHeight: 52, color: T.text },
  rule:   { width: 48, height: 2, backgroundColor: T.red, marginVertical: 12 },
  sub:    { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, letterSpacing: 1 },

  thumb:    { width: IMG_SIZE, height: IMG_SIZE, backgroundColor: T.surface },
  multiDot: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  multiDotText: { fontFamily: T.fontBodyBd, fontSize: 10, color: '#fff' },
  editDot: { position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  addPhotosBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.red, paddingHorizontal: 14, paddingVertical: 10 },
  addPhotosBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1.5, color: '#fff' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.textDim, marginBottom: 8 },
  emptyText:  { fontFamily: T.fontBody, fontSize: 13, color: T.textFaint, textAlign: 'center' },

  // Lightbox
  lbBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  lbInner:    { width: W, height: H * 0.78, alignItems: 'center', justifyContent: 'center' },
  lbImg:      { width: W - 40, height: H * 0.65 },
  lbMeta:     { alignItems: 'center', marginTop: 14 },
  lbTitle:    { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 2, color: T.text, textAlign: 'center' },
  lbIndex:    { fontFamily: T.fontBodyMd, fontSize: 11, color: T.textDim, marginTop: 4 },
  lbArrow:    { position: 'absolute', top: '40%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  lbArrowText:{ color: '#fff', fontSize: 28, lineHeight: 32 },
  lbClose:    { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
}); }
