import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';

const FILTERS = [
  { id: 'ALL',       label: 'ALL' },
  { id: 'ARTICLE',   label: 'ARTICLES' },
  { id: 'PROMOTION', label: 'PROMOS' },
  { id: 'NEWS',      label: 'NEWS' },
];

const CAT_LABELS = { ARTICLE: 'ARTICLE', PROMOTION: 'PROMO', NEWS: 'NEWS' };

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
            {/* Category badge */}
            <View style={[ms.catBadge, { backgroundColor: CAT_COLORS[cat] + '22', borderColor: CAT_COLORS[cat] }]}>
              <Text style={[ms.catLabel, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat] || cat}</Text>
            </View>

            <Text style={ms.title}>{post.title}</Text>
            <Text style={ms.date}>{fmtDate(post.createdAt)}</Text>
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

export default function WhatsOnScreen({ navigation }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const CAT_COLORS = useMemo(() => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold }), [T]);
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('ALL');
  const [search,  setSearch]  = useState('');
  const [reading, setReading] = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    api.get('/whats-on/posts')
      .then(r => setPosts(r.data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q        = search.trim().toLowerCase();
  const filtered = posts
    .filter(p => filter === 'ALL' || p.category === filter)
    .filter(p => !q || p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q));

  const pinned  = filtered.filter(p => p.pinned);
  const regular = filtered.filter(p => !p.pinned);

  const renderCard = ({ item, index }) => {
    const cat = item.category;
    return (
      <FadeInCard index={index}>
        <TouchableOpacity style={s.card} onPress={() => setReading(item)} activeOpacity={0.82}>
          {item.pinned && <View style={s.featuredBar} />}
          <View style={s.cardTop}>
            <View style={[s.catChip, { borderColor: CAT_COLORS[cat] }]}>
              <Text style={[s.catText, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat] || cat}</Text>
            </View>
            <Text style={s.dateText}>{fmtDate(item.createdAt)}</Text>
          </View>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          {!!item.excerpt && <Text style={s.cardExcerpt} numberOfLines={3}>{item.excerpt}</Text>}
          <Text style={s.readMore}>Read more →</Text>
        </TouchableOpacity>
      </FadeInCard>
    );
  };

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
        <Text style={s.eyebrow}>THE COMMUNITY</Text>
        <Text style={s.pageTitle}>What's On</Text>
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
  featuredBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: T.gold },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catChip:     { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2 },
  catText:     { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
  dateText:    { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  cardTitle:   { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 1, color: T.text, marginBottom: 6, lineHeight: 22 },
  cardExcerpt: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, lineHeight: 19, marginBottom: 10 },
  readMore:    { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: T.red },

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

  catBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 14 },
  catLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
  title:    { fontFamily: T.fontHead, fontSize: 30, letterSpacing: 1, color: T.text, lineHeight: 32, marginBottom: 6 },
  date:     { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 14 },
  divider:  { height: 1, backgroundColor: T.border, marginBottom: 16 },
  excerpt:  { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, lineHeight: 22, marginBottom: 16, fontStyle: 'italic' },
}); }

// ── Body block styles ──────────────────────────────────────────────────────
function makeRsStyles(T) { return StyleSheet.create({
  bh:  { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 1, color: T.text, marginTop: 18, marginBottom: 6 },
  bp:  { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22, marginBottom: 12 },
  bul: { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, lineHeight: 22, marginBottom: 4, paddingLeft: 8 },
}); }
