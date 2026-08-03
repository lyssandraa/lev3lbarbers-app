import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const CATS = ['ARTICLE', 'PROMOTION', 'NEWS'];
const CAT_COLORS = (T) => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold });
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

const BLANK = { title: '', category: 'ARTICLE', authorName: '', excerpt: '', body: '', tags: '', pinned: false, published: true };

export default function WhatsOnSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const catColors = useMemo(() => CAT_COLORS(T), [T]);

  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/whats-on/posts/all');
      setPosts(r.data.posts || []);
    } catch { Alert.alert('Error', 'Could not load posts.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title || '', category: p.category || 'ARTICLE', authorName: p.authorName || '', excerpt: p.excerpt || '', body: p.body || '', tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''), pinned: !!p.pinned, published: p.published !== false });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    setSaving(true);
    try {
      const body = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (editing) {
        await api.put(`/whats-on/posts/${editing.id}`, body);
      } else {
        await api.post('/whats-on/posts', body);
      }
      setShowForm(false);
      load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

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
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editing ? 'EDIT POST' : 'NEW POST'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={20} color={T.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>TITLE *</Text>
              <TextInput style={s.input} value={form.title} onChangeText={set('title')} placeholder="Post title" placeholderTextColor={T.textFaint} />

              <Text style={s.fieldLabel}>CATEGORY</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {CATS.map(c => (
                  <TouchableOpacity key={c} style={[s.catBtn, form.category === c && { borderColor: catColors[c], backgroundColor: catColors[c] + '22' }]} onPress={() => set('category')(c)} activeOpacity={0.7}>
                    <Text style={[s.catBtnText, form.category === c && { color: catColors[c] }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>AUTHOR</Text>
              <TextInput style={s.input} value={form.authorName} onChangeText={set('authorName')} placeholder="Author name" placeholderTextColor={T.textFaint} />

              <Text style={s.fieldLabel}>EXCERPT</Text>
              <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={form.excerpt} onChangeText={set('excerpt')} placeholder="Short summary…" placeholderTextColor={T.textFaint} multiline />

              <Text style={s.fieldLabel}>BODY</Text>
              <TextInput style={[s.input, { height: 140, textAlignVertical: 'top' }]} value={form.body} onChangeText={set('body')} placeholder="Full post content. Use ## for headings, - for bullets." placeholderTextColor={T.textFaint} multiline />

              <Text style={s.fieldLabel}>TAGS (comma separated)</Text>
              <TextInput style={s.input} value={form.tags} onChangeText={set('tags')} placeholder="e.g. haircut, promo, tips" placeholderTextColor={T.textFaint} />

              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch value={form.pinned} onValueChange={set('pinned')} trackColor={{ true: T.gold, false: T.border }} thumbColor={form.pinned ? '#fff' : T.textFaint} />
                  <Text style={s.switchLabel}>Pinned</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch value={form.published} onValueChange={set('published')} trackColor={{ true: '#22c55e', false: T.border }} thumbColor={form.published ? '#fff' : T.textFaint} />
                  <Text style={s.switchLabel}>Published</Text>
                </View>
              </View>

              <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE POST</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  catBtn: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 8, alignItems: 'center' },
  catBtnText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
