import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import WhatsOnPostFormModal from '../../../components/WhatsOnPostFormModal';

const CAT_COLORS = (T) => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold });
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export default function WhatsOnSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const catColors = useMemo(() => CAT_COLORS(T), [T]);

  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/whats-on/posts/all');
      setPosts(r.data.posts || []);
    } catch { Alert.alert('Error', 'Could not load posts.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setShowForm(true); };
  const onSaved  = () => { setShowForm(false); load(); };

  const remove = (post) => {
    Alert.alert('Delete Post', `Remove "${post.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/whats-on/posts/${post.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListHeaderComponent={
          <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>NEW POST</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={s.empty}>No posts yet.</Text>}
        renderItem={({ item: p }) => {
          const col = catColors[p.category] || T.textDim;
          return (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={[s.catChip, { borderColor: col }]}>
                    <Text style={[s.catText, { color: col }]}>{p.category}</Text>
                  </View>
                  <Text style={s.postTitle}>{p.title}</Text>
                  <Text style={s.postMeta}>{fmtDate(p.createdAt)} · {p.authorName || '—'}</Text>
                </View>
                <View style={{ gap: 4 }}>
                  {p.pinned && <View style={s.badge}><Text style={s.badgeText}>PINNED</Text></View>}
                  {!p.published && <View style={[s.badge, { borderColor: T.textDim }]}><Text style={[s.badgeText, { color: T.textDim }]}>DRAFT</Text></View>}
                  {p.expiresAt && new Date(p.expiresAt) <= new Date() && (
                    <View style={[s.badge, { borderColor: T.red }]}><Text style={[s.badgeText, { color: T.red }]}>EXPIRED</Text></View>
                  )}
                  {p.expiresAt && new Date(p.expiresAt) > new Date() && (
                    <View style={[s.badge, { borderColor: T.textDim }]}><Text style={[s.badgeText, { color: T.textDim }]}>EXP {fmtDate(p.expiresAt)}</Text></View>
                  )}
                </View>
              </View>
              {p.excerpt && <Text style={s.excerpt} numberOfLines={2}>{p.excerpt}</Text>}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(p)}>
                  <Ionicons name="pencil-outline" size={14} color={T.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(p)}>
                  <Ionicons name="trash-outline" size={14} color={T.red} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <WhatsOnPostFormModal
        visible={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={onSaved}
      />
    </>
  );
}

function makeStyles(T) { return StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 12 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  catChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  catText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
  postTitle: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, marginBottom: 3, lineHeight: 18 },
  postMeta: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  badge: { borderWidth: 1, borderColor: T.gold, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 1, color: T.gold },
  excerpt: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
}); }
