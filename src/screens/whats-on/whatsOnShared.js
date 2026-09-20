import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Image, Linking, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export const { width: SCREEN_W } = Dimensions.get('window');
export const CARD_IMG_H = 140;
export const CARD_IMG_W = SCREEN_W - 32; // FlatList's 16px horizontal padding on each side

/* Bolder/darker replacements for T.textDim/T.textFaint on specifically the
   excerpt/date/body text here — matches the website's WhatsOn.jsx contrast
   pass without touching the shared theme tokens used all over the rest of
   the app. T.text differs exactly between the two theme objects, so it
   doubles as a cheap light/dark check. */
export const strongDim   = (T) => T.text === '#1a1a1a' ? 'rgba(26,26,26,0.78)' : 'rgba(234,224,202,0.72)';
export const strongFaint = (T) => T.text === '#1a1a1a' ? 'rgba(26,26,26,0.62)' : 'rgba(234,224,202,0.55)';

export const URGENT_MS = 24 * 60 * 60 * 1000;

/* Mirrors the website's countdown: coarse "3d 4h left" text normally, a
   real ticking HH:MM:SS clock once inside the last 24h. */
export const formatCountdown = (ms, urgent) => {
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

export function useCountdown(expiresAt) {
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
export function CountdownBadge({ countdown }) {
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
export function FocusedImage({ uri, focusY = 50, width, height, style }) {
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

export const CAT_LABELS = { ARTICLE: 'ARTICLE', PROMOTION: 'PROMO', NEWS: 'NEWS' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const fmtDate = (s) => { const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

// Lightweight body parser — matches website's parseBlocks + renderInline
export function parseBody(body) {
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

// Matches http(s):// URLs and bare "www." ones, trimming a trailing char
// that's likely sentence punctuation rather than part of the URL — mirrors
// the website's WhatsOn.jsx linkify. RN Text supports nested, individually
// tappable Text children, which is how a URL inside a run of plain text
// becomes just that one word tappable.
const URL_SPLIT_REGEX = /((?:https?:\/\/|www\.)[^\s]+[^\s.,;:'")\]])/gi;
const isUrl = (s) => /^(?:https?:\/\/|www\.)/i.test(s);

export function linkifyText(text, linkStyle) {
  return text.split(URL_SPLIT_REGEX).map((part, i) => {
    if (!isUrl(part)) return part;
    const href = part.startsWith('www.') ? `https://${part}` : part;
    return (
      <Text key={i} style={linkStyle} onPress={() => Linking.openURL(href).catch(() => {})}>
        {part}
      </Text>
    );
  });
}

export function BodyBlock({ block }) {
  const { T } = useTheme();
  const rs = useMemo(() => makeRsStyles(T), [T]);
  const text = (block.text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  if (block.t === 'h') return <Text style={rs.bh}>{block.text}</Text>;
  if (block.t === 'p') return <Text style={rs.bp}>{linkifyText(text, rs.link)}</Text>;
  if (block.t === 'ul') return (
    <View style={{ marginBottom: 10 }}>
      {block.items.map((it, i) => <Text key={i} style={rs.bul}>• {linkifyText(it, rs.link)}</Text>)}
    </View>
  );
  if (block.t === 'ol') return (
    <View style={{ marginBottom: 10 }}>
      {block.items.map((it, i) => <Text key={i} style={rs.bul}>{i + 1}. {linkifyText(it, rs.link)}</Text>)}
    </View>
  );
  return null;
}

function makeRsStyles(T) { return StyleSheet.create({
  bh:  { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 1, color: T.text, marginTop: 18, marginBottom: 6 },
  bp:  { fontFamily: T.fontBodyMd, fontSize: 14, color: strongDim(T), lineHeight: 22, marginBottom: 12 },
  bul: { fontFamily: T.fontBodyMd, fontSize: 14, color: strongDim(T), lineHeight: 22, marginBottom: 4, paddingLeft: 8 },
  link: { color: T.red, textDecorationLine: 'underline' },
}); }
