import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput, ActivityIndicator,
  Animated, Pressable, Alert, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { resolveImageUrl } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import WhatsOnPostFormModal from '../../components/WhatsOnPostFormModal';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_IMG_H    = 140;
const CARD_IMG_W    = SCREEN_W - 32;   // FlatList's 16px horizontal padding on each side
const MODAL_COVER_H = 200;
const MODAL_COVER_W = SCREEN_W - 40;   // sheet's 20px padding on each side

/* Bolder/darker replacements for T.textDim/T.textFaint on specifically the
   excerpt/date/body text here — matches the website's WhatsOn.jsx contrast
   pass without touching the shared theme tokens used all over the rest of
   the app. T.text differs exactly between the two theme objects, so it
   doubles as a cheap light/dark check. */
const strongDim   = (T) => T.text === '#1a1a1a' ? 'rgba(26,26,26,0.78)' : 'rgba(234,224,202,0.72)';
const strongFaint = (T) => T.text === '#1a1a1a' ? 'rgba(26,26,26,0.62)' : 'rgba(234,224,202,0.55)';

const URGENT_MS = 24 * 60 * 60 * 1000;

/* Mirrors the website's countdown: coarse "3d 4h left" text normally, a
   real ticking HH:MM:SS clock once inside the last 24h. */
const formatCountdown = (ms, urgent) => {
  const totalSeconds = Math.floor(ms / 1000);
  if (urgent) {
    const pad = (n) => String(n).padStart(2, '0');
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  }
  const mins  = Math.floor(ms / 60000);
  const days  = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0)  return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const urgent = remaining !== null && remaining > 0 && remaining < URGENT_MS;

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), urgent ? 1000 : 30000);
    return () => clearInterval(id);
  }, [expiresAt, urgent]);

  if (!expiresAt || remaining <= 0) return null;
  return { text: formatCountdown(remaining, urgent), urgent };
}

/* Countdown badge — calm gold pill with an hourglass normally; once urgent,
   a solid red pill that pulses (scale + shadow) with a shaking flame icon
   and a live-ticking clock. RN has no cheap equivalent of the website's
   crawling diagonal hazard-stripe background (that used an animated CSS
   background-position, which isn't something React Native's style system
   drives the same way), so the drama here comes from the pulse + shake +
   live ticking digits instead. */
function CountdownBadge({ countdown }) {
  const { T } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!countdown?.urgent) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 550, useNativeDriver: true }),
      ])
    );
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1,  duration: 90,  useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1,  duration: 120, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0,  duration: 140, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );
    pulseLoop.start(); shakeLoop.start();
    return () => { pulseLoop.stop(); shakeLoop.stop(); pulse.setValue(0); shake.setValue(0); };
  }, [countdown?.urgent]);

  if (!countdown) return null;
  const scale  = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] });

  return (
    <Animated.View
      style={[
        cs.countdown,
        { backgroundColor: countdown.urgent ? T.red : T.goldDim, borderColor: countdown.urgent ? '#ff5a5a' : T.gold },
        countdown.urgent && { transform: [{ scale }], shadowColor: T.red, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
      ]}
    >
      <Animated.Text style={[cs.countdownIcon, countdown.urgent && { transform: [{ rotate }] }]}>
        {countdown.urgent ? '🔥' : '⏳'}
      </Animated.Text>
      <Text style={[cs.countdownText, { color: countdown.urgent ? '#fff' : T.text }]}>{countdown.text}</Text>
    </Animated.View>
  );
}

const cs = StyleSheet.create({
  countdown: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  countdownIcon: { fontSize: 11 },
  countdownText: { fontFamily: 'Montserrat_700Bold', fontSize: 11, letterSpacing: 0.4 },
});

/* Emulates the website's `object-position: center Y%` — RN's Image has no
   equivalent, so a cover-fit crop always centers. Measures the image's
   natural size once, computes the same scale/offset math CSS uses for
   object-fit:cover + object-position, and positions an oversized Image
   inside an overflow:hidden box to shift which part stays in frame. Falls
   back to a plain centered cover image until the natural size is known. */
function FocusedImage({ uri, focusY = 50, width, height, style }) {
  const [natural, setNatural] = useState(null);

  useEffect(() => {
    setNatural(null);
    if (!uri) return;
    let cancelled = false;
    Image.getSize(uri, (w, h) => { if (!cancelled) setNatural({ w, h }); }, () => {});
    return () => { cancelled = true; };
  }, [uri]);

  if (!natural) {
    return <Image source={{ uri }} style={[{ width, height }, style]} resizeMode="cover" />;
  }

  const scale = Math.max(width / natural.w, height / natural.h);
  const dw = natural.w * scale;
  const dh = natural.h * scale;
  const top = (height - dh) * (focusY / 100);
  const left = (width - dw) / 2;

  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <Image source={{ uri }} style={{ width: dw, height: dh, position: 'absolute', top, left }} />
    </View>
  );
}

const FILTERS = [
  { id: 'ALL',       label: 'ALL' },
  { id: 'ARTICLE',   label: 'ARTICLES' },
  { id: 'PROMOTION', label: 'PROMOS' },
  { id: 'NEWS',      label: 'NEWS' },
];

const CAT_LABELS = { ARTICLE: 'ARTICLE', PROMOTION: 'PROMO', NEWS: 'NEWS' };
const VALID_FILTERS = FILTERS.map(f => f.id);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

// Lightweight body parser — matches website's parseBlocks + renderInline
function parseBody(body) {
  if (!body) return [];
  const lines = body.split('\n');
  const out = [];
  let para = [];
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ').trim() }); para = []; } };
  let i = 0;
  while (i < lines.length) {
    const s = lines[i].trim();
    if (!s)              { flush(); i++; continue; }
    if (/^##\s+/.test(s)){ flush(); out.push({ t: 'h', text: s.replace(/^##\s+/, '') }); i++; continue; }
    if (/^[-•]\s+/.test(s)) {
      flush();
      const items = [];
      while (i < lines.length && /^[-•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•]\s+/, '')); i++;
      }
      out.push({ t: 'ul', items }); continue;
    }
    if (/^\d+[.)]\s+/.test(s)) {
      flush();
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, '')); i++;
      }
      out.push({ t: 'ol', items }); continue;
    }
    para.push(s); i++;
  }
  flush();
  return out;
}

function BodyBlock({ block }) {
  const { T } = useTheme();
  const rs = useMemo(() => makeRsStyles(T), [T]);
  const text = (block.text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  if (block.t === 'h') return <Text style={rs.bh}>{block.text}</Text>;
  if (block.t === 'p') return <Text style={rs.bp}>{text}</Text>;
  if (block.t === 'ul') return (
    <View style={{ marginBottom: 10 }}>
      {block.items.map((it, i) => <Text key={i} style={rs.bul}>• {it}</Text>)}
    </View>
  );
  if (block.t === 'ol') return (
    <View style={{ marginBottom: 10 }}>
      {block.items.map((it, i) => <Text key={i} style={rs.bul}>{i + 1}. {it}</Text>)}
    </View>
  );
  return null;
}

function ArticleModal({ post, onClose }) {
  const { T } = useTheme();
  const ms = useMemo(() => makeMsStyles(T), [T]);
  const CAT_COLORS = useMemo(() => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold }), [T]);
  const blocks = parseBody(post.body);
  const cat    = post.category;
  const countdown = useCountdown(post.expiresAt);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}}>
        <SafeAreaView style={ms.sheet} edges={['top', 'bottom']}>
          {/* Handle + close */}
          <View style={ms.handle} />
          <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={T.text} />
          </TouchableOpacity>

          <ScrollView style={ms.scroll} showsVerticalScrollIndicator={false}>
            {!!post.imageUrl && (
              <FocusedImage
                uri={resolveImageUrl(post.imageUrl)}
                focusY={post.imageFocusY ?? 50}
                width={MODAL_COVER_W}
                height={MODAL_COVER_H}
                style={ms.cover}
              />
            )}

            {/* Category badge */}
            <View style={[ms.catBadge, { backgroundColor: CAT_COLORS[cat] + '22', borderColor: CAT_COLORS[cat] }]}>
              <Text style={[ms.catLabel, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat] || cat}</Text>
            </View>

            <Text style={ms.title}>{post.title}</Text>
            <Text style={ms.date}>{fmtDate(post.createdAt)}</Text>
            <CountdownBadge countdown={countdown} />
            <View style={ms.divider} />

            {post.excerpt ? <Text style={ms.excerpt}>{post.excerpt}</Text> : null}

            {blocks.map((b, i) => <BodyBlock key={i} block={b} />)}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  const [reading, setReading] = useState(null);
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
      onOpen={() => setReading(item)}
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

      {reading && <ArticleModal post={reading} onClose={() => setReading(null)} />}

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

  filterRow:     { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: T.border },
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

// ── Article modal styles ───────────────────────────────────────────────────
function makeMsStyles(T) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', borderWidth: 1, borderColor: T.border },
  handle:   { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  closeBtn: { position: 'absolute', right: 16, top: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  scroll:   { padding: 20, paddingTop: 44 },

  cover:    { borderRadius: 8, marginBottom: 16, backgroundColor: T.surface },
  catBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 14 },
  catLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
  title:    { fontFamily: T.fontHead, fontSize: 30, letterSpacing: 1, color: T.text, lineHeight: 32, marginBottom: 6 },
  date:     { fontFamily: T.fontBodyBd, fontSize: 11, color: strongFaint(T), marginBottom: 14 },
  divider:  { height: 1, backgroundColor: T.border, marginBottom: 16 },
  excerpt:  { fontFamily: T.fontBodyBd, fontSize: 14, color: strongDim(T), lineHeight: 22, marginBottom: 16, fontStyle: 'italic' },
}); }

// ── Body block styles ──────────────────────────────────────────────────────
function makeRsStyles(T) { return StyleSheet.create({
  bh:  { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 1, color: T.text, marginTop: 18, marginBottom: 6 },
  bp:  { fontFamily: T.fontBodyMd, fontSize: 14, color: strongDim(T), lineHeight: 22, marginBottom: 12 },
  bul: { fontFamily: T.fontBodyMd, fontSize: 14, color: strongDim(T), lineHeight: 22, marginBottom: 4, paddingLeft: 8 },
}); }
