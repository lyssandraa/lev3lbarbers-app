import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveImageUrl } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import {
  CountdownBadge, useCountdown, FocusedImage, CAT_LABELS, fmtDate, parseBody, BodyBlock,
} from './whatsOnShared';

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_H = 220;

// A real pushed screen, not the floating <Modal> bottom-sheet this used to
// be. That approach caused three separate rounds of bugs: the sheet's
// auto-height (capped only by maxHeight, never a real height) fighting the
// ScrollView for space, and the backdrop Pressable wrapping the ScrollView
// creating an intermittent touch-responder conflict that made scrolling
// freeze unpredictably. A normal screen has a definite-size container from
// the navigator itself, so the ScrollView just works, and swipe-back is
// the navigator's own correct pop-to-previous-screen — no bespoke gesture
// handling needed here at all.
export default function ArticleScreen({ navigation, route }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const post = route.params?.post;
  const countdown = useCountdown(post?.expiresAt);
  const CAT_COLORS = useMemo(() => ({ ARTICLE: T.text, PROMOTION: T.red, NEWS: T.gold }), [T]);

  if (!post) return null;

  const blocks = parseBody(post.body);
  const cat = post.category;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={T.text} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {!!post.imageUrl && (
          <FocusedImage
            uri={resolveImageUrl(post.imageUrl)}
            focusY={post.imageFocusY ?? 50}
            width={SCREEN_W}
            height={COVER_H}
            style={s.cover}
          />
        )}

        <View style={s.body}>
          <View style={[s.catBadge, { backgroundColor: CAT_COLORS[cat] + '22', borderColor: CAT_COLORS[cat] }]}>
            <Text style={[s.catLabel, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat] || cat}</Text>
          </View>

          <Text style={s.title}>{post.title}</Text>
          <Text style={s.date}>{fmtDate(post.createdAt)}</Text>
          <CountdownBadge countdown={countdown} />
          <View style={s.divider} />

          {post.excerpt ? <Text style={s.excerpt}>{post.excerpt}</Text> : null}

          {blocks.map((b, i) => <BodyBlock key={i} block={b} />)}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(T) {
  const strongDim   = T.text === '#1a1a1a' ? 'rgba(26,26,26,0.78)' : 'rgba(234,224,202,0.72)';
  const strongFaint = T.text === '#1a1a1a' ? 'rgba(26,26,26,0.62)' : 'rgba(234,224,202,0.55)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },

    topBar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText:{ fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },

    scrollContent: { paddingBottom: 20 },
    cover: { backgroundColor: T.surface },
    body:  { padding: 20 },

    catBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 14 },
    catLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2 },
    title:    { fontFamily: T.fontHead, fontSize: 30, letterSpacing: 1, color: T.text, lineHeight: 32, marginBottom: 6 },
    date:     { fontFamily: T.fontBodyBd, fontSize: 11, color: strongFaint, marginBottom: 14 },
    divider:  { height: 1, backgroundColor: T.border, marginBottom: 16 },
    excerpt:  { fontFamily: T.fontBodyBd, fontSize: 14, color: strongDim, lineHeight: 22, marginBottom: 16, fontStyle: 'italic' },
  });
}
