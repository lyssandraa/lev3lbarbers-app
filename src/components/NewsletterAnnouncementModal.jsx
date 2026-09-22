import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SEEN_KEY = 'newsletter_announcement_seen_v1';

// One-time announcement for existing users after the newsletter feature
// shipped — otherwise it's easy to miss, buried in Profile > Settings.
// Local-only "seen" flag (AsyncStorage), not server-tracked: this is a
// one-off UI nudge, not data that needs to survive a reinstall or sync
// across a user's devices.
export default function NewsletterAnnouncementModal() {
  const { user, setUser } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [visible, setVisible] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!user || user.newsletterOptIn) return;
    let cancelled = false;
    AsyncStorage.getItem(SEEN_KEY).then(seen => {
      if (!seen && !cancelled) {
        // Small delay so this doesn't fight WinnerModal/IncomingInviteModal
        // for the screen if one of those is also about to show.
        setTimeout(() => { if (!cancelled) setVisible(true); }, 900);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.newsletterOptIn]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  };

  const subscribe = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { newsletterOptIn: true });
      setUser(u => ({ ...u, newsletterOptIn: true }));
    } catch {
      // Not fatal — worst case they can opt in later from Profile > Settings.
    } finally {
      setSaving(false);
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={26} color={T.gold} />
          </View>
          <Text style={s.title}>We Just Launched a Newsletter</Text>
          <Text style={s.body}>
            Occasional news, offers, and updates from LEV3L Barbers — straight to your inbox.
            Want in?
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={subscribe} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>YES, SUBSCRIBE ME</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={dismiss} disabled={saving} activeOpacity={0.7}>
            <Text style={s.secondaryBtnText}>No thanks</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(T) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, padding: 26, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: T.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 0.5, color: T.text, textAlign: 'center', marginBottom: 10, lineHeight: 24 },
  body: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, textAlign: 'center', lineHeight: 19, marginBottom: 22 },

  primaryBtn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 48 },
  primaryBtnText: { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: '#fff' },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryBtnText: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textFaint },
}); }
