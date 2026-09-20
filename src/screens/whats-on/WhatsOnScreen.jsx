import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { resolveImageUrl } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import WhatsOnPostFormModal from '../../components/WhatsOnPostFormModal';
import {
  CARD_IMG_H, CARD_IMG_W, strongDim, strongFaint, useCountdown, CountdownBadge,
  FocusedImage, CAT_LABELS, fmtDate,
} from './whatsOnShared';

const FILTERS = [
  { id: 'ALL',       label: 'ALL' },
  { id: 'ARTICLE',   label: 'ARTICLES' },
  { id: 'PROMOTION', label: 'PROMOS' },
  { id: 'NEWS',      label: 'NEWS' },
];
const VALID_FILTERS = FILTERS.map(f => f.id);

function FadeInCard({ index, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// Its own component (not an inline render function) specifically so
// useCountdown's hooks are legal — FlatList's renderItem isn't a component
// as far as React's Rules of Hooks are concerned, so a hook can't live
// directly inside it.
function PostCard({ item, index, isAdmin, T, CAT_COLORS, s, onOpen, onEdit, onRemove }) {
  const cat = item.category;
  const countdown = useCountdown(item.expiresAt);
  return (
    <FadeInCard index={index}>
      <TouchableOpacity style={s.card} onPress={onOpen} activeOpacity={0.82}>
        {!!item.imageUrl && (
          <FocusedImage
            uri={resolveImageUrl(item.imageUrl)}
            focusY={item.imageFocusY ?? 50}
            width={CARD_IMG_W}
            height={CARD_IMG_H}
            style={s.cardImg}
          />
        )}
        {item.pinned && <View style={s.featuredBar} />}
        <View style={s.cardTop}>
          <View style={[s.catChip, { borderColor: CAT_COLORS[cat] }]}>
            <Text style={[s.catText, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat] || cat}</Text>
          </View>
          <Text style={s.dateText}>{fmtDate(item.createdAt)}</Text>
        </View>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
        <CountdownBadge countdown={countdown} />
        {!!item.excerpt && <Text style={s.cardExcerpt} numberOfLines={3}>{item.excerpt}</Text>}
        {isAdmin ? (
          <View style={s.adminRow}>
            {!item.published && (
              <View style={s.draftBadge}><Text style={s.draftBadgeText}>DRAFT</Text></View>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={s.adminIconBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={15} color={T.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.adminIconBtn, { borderColor: T.red }]} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={T.red} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={s.readMore}>Read more →</Text>
        )}
      </TouchableOpacity>
    </FadeInCard>
  );
}

export default function WhatsOnScreen({ navigation, route }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const { isAdmin } = useAuth();
  const CAT_COLORS = useMemo(() => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold }), [T]);
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  // Supports linking straight to a category, e.g. navigation.navigate('WhatsOn', { filter: 'PROMOTION' })
  const [filter,  setFilter]  = useState(() => {
    const fromParams = route?.params?.filter?.toUpperCase();
    return VALID_FILTERS.includes(fromParams) ? fromParams : 'ALL';
  });
  const [search,  setSearch]  = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Admins see drafts too (via /posts/all), so they can publish/finish a
  // post without a separate trip through the admin panel.
  const load = useCallback(() => {
    setLoading(true);
    api.get(isAdmin ? '/whats-on/posts/all' : '/whats-on/posts')
      .then(r => setPosts(r.data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditingPost(null); setShowForm(true); };
  const openEdit = (post) => { setEditingPost(post); setShowForm(true); };
  const onSaved  = () => { setShowForm(false); load(); };

  const removePost = (post) => {
    Alert.alert('Delete Post', `Remove "${post.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/whats-on/posts/${post.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const q        = search.trim().toLowerCase();
  const filtered = posts
    .filter(p => filter === 'ALL' || p.category === filter)
    .filter(p => !q || p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q));

  const pinned  = filtered.filter(p => p.pinned);
  const regular = filtered.filter(p => !p.pinned);

  const renderCard = ({ item, index }) => (
    <PostCard
      item={item} index={index} isAdmin={isAdmin} T={T} CAT_COLORS={CAT_COLORS} s={s}
      onOpen={() => navigation.navigate('Article', { post: item })}
      onEdit={() => openEdit(item)}
      onRemove={() => removePost(item)}
    />
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <Animated.View
        style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}
      >
        {navigation?.canGoBack?.() && (
          <TouchableOpacity style={{ marginBottom: 10 }} onPress={() => navigation.goBack()}>
            <Text style={{ fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, letterSpacing: 1 }}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>THE COMMUNITY</Text>
            <Text style={s.pageTitle}>What's On</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={s.newPostBtn} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.newPostBtnText}>NEW POST</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.rule} />
        <Text style={s.sub}>Articles · Promotions · Shop News</Text>
      </Animated.View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.filterChip, filter === f.id && s.filterChipActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterLabel, filter === f.id && s.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search posts, tags..."
          placeholderTextColor={T.textFaint}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={T.textDim} style={{ padding: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Nothing Here Yet</Text>
          <Text style={s.emptyText}>{search ? 'No posts match your search.' : 'Check back soon.'}</Text>
        </View>
      ) : (
        <FlatList
          data={[...pinned, ...regular]}
          keyExtractor={p => String(p.id)}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        />
      )}

      {isAdmin && (
        <WhatsOnPostFormModal
          visible={showForm}
          editing={editingPost}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </SafeAreaView>
  );
}

// ── Screen styles ──────────────────────────────────────────────────────────
function makeStyles(T) { return StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },

  header:    { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  eyebrow:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 4 },
  pageTitle: { fontFamily: T.fontHead, fontSize: 52, letterSpacing: -0.5, lineHeight: 52, color: T.text },
  rule:      { width: 48, height: 2, backgroundColor: T.red, marginVertical: 12 },
  sub:       { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, letterSpacing: 1 },

  newPostBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.red, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  newPostBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1.5, color: '#fff' },

  // Was maxHeight: 48, which clipped the tops of the filter labels — this
  // custom display font's actual rendered line height (letterSpacing: 2 on
  // top of it) needs a bit more than that to not get cut. Also switched to
  // a fixed height (not maxHeight) so it can't be squeezed by anything else.
  filterRow:     { height: 56, borderBottomWidth: 1, borderBottomColor: T.border },
  filterContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  filterChip:    { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterChipActive: { borderBottomColor: T.red },
  filterLabel:      { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: T.textDim },
  filterLabelActive:{ color: T.text },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, height: 42 },
  searchIcon:  { fontSize: 18, color: T.textDim, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: T.fontBody, fontSize: 14, color: T.text },

  card:        { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 10, padding: 16, overflow: 'hidden' },
  cardImg:     { marginTop: -16, marginHorizontal: -16, marginBottom: 12 },
  featuredBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: T.gold },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catChip:     { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2 },
  catText:     { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
  dateText:    { fontFamily: T.fontBodyBd, fontSize: 11, color: strongFaint(T) },
  cardTitle:   { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 1, color: T.text, marginBottom: 6, lineHeight: 22 },
  cardExcerpt: { fontFamily: T.fontBodyMd, fontSize: 13, color: strongDim(T), lineHeight: 19, marginBottom: 10 },
  readMore:    { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: T.red },

  adminRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  adminIconBtn:  { width: 30, height: 30, borderWidth: 1, borderColor: T.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  draftBadge:    { borderWidth: 1, borderColor: T.textDim, paddingHorizontal: 6, paddingVertical: 2 },
  draftBadgeText:{ fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 1, color: T.textDim },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:{ fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.textDim, marginBottom: 8 },
  emptyText: { fontFamily: T.fontBody, fontSize: 13, color: T.textFaint, textAlign: 'center' },
}); }
