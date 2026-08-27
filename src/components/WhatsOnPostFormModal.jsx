import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Modal, ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const CATS = ['ARTICLE', 'PROMOTION', 'NEWS'];
const BLANK = { title: '', category: 'ARTICLE', authorName: '', excerpt: '', body: '', tags: '', pinned: false, published: true, expiresAt: '' };

// No native date-picker dependency in the app yet (adding one needs a new
// native build), so the expiry is a plain "YYYY-MM-DD HH:mm" text field —
// matches the website's admin-only, occasional-use nature of this field.
const toExpiryInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const parseExpiryInput = (text) => {
  const t = text.trim();
  if (!t) return { ok: true, value: null };
  const d = new Date(t.replace(' ', 'T'));
  if (isNaN(d.getTime())) return { ok: false, value: null };
  return { ok: true, value: d.toISOString() };
};

// Shared create/edit form for What's On posts — used by both the admin
// panel's What's On section and the inline editor on the public-facing
// What's On screen, so there's one place that knows how to save a post.
export default function WhatsOnPostFormModal({ visible, editing, onClose, onSaved }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const catColors = useMemo(() => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold }), [T]);
  const [form,   setForm]   = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        title:      editing.title || '',
        category:   editing.category || 'ARTICLE',
        authorName: editing.authorName || '',
        excerpt:    editing.excerpt || '',
        body:       editing.body || '',
        tags:       Array.isArray(editing.tags) ? editing.tags.join(', ') : (editing.tags || ''),
        pinned:     !!editing.pinned,
        published:  editing.published !== false,
        expiresAt:  toExpiryInput(editing.expiresAt),
      });
    } else {
      setForm(BLANK);
    }
  }, [visible, editing]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    if (!form.body.trim())  { Alert.alert('Required', 'Body is required.'); return; }
    const expiry = parseExpiryInput(form.expiresAt);
    if (!expiry.ok) { Alert.alert('Invalid date', 'Use the format YYYY-MM-DD HH:mm, e.g. 2026-09-01 18:00.'); return; }
    // Publishing with an expiry date already in the past (e.g. reactivating
    // an old promo without touching its stale date) would just get it
    // auto-expired again on the next job run — clear it instead.
    const expiresAtValue = (form.published && expiry.value && new Date(expiry.value) <= new Date())
      ? null
      : expiry.value;
    setSaving(true);
    try {
      const body = {
        ...form,
        expiresAt: expiresAtValue,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editing) await api.put(`/whats-on/posts/${editing.id}`, body);
      else         await api.post('/whats-on/posts', body);
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
            <Text style={s.sheetTitle}>{editing ? 'EDIT POST' : 'NEW POST'}</Text>
            <TouchableOpacity onPress={onClose}>
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

            <Text style={s.fieldLabel}>EXPIRES (optional)</Text>
            <TextInput style={s.input} value={form.expiresAt} onChangeText={set('expiresAt')} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={T.textFaint} autoCapitalize="none" />
            <Text style={s.expiryHint}>Auto-hides after this time — stays saved so you can reactivate it later. Leave blank for no expiry.</Text>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(T) { return StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  expiryHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginTop: -6, marginBottom: 14, lineHeight: 15 },
  catBtn: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 8, alignItems: 'center' },
  catBtnText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.text },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
