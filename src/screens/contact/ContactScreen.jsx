import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Share,
  Animated, Easing, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;
const GOOGLE_MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2365.179804219527!2d-3.0026584655850725!3d53.64376606025772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487b3f28c2404633%3A0x865d00ff707467f9!2sLev3l%20barbers!5e0!3m2!1sen!2suk!4v1752950880062!5m2!1sen!2suk';

// Injecting as local HTML bypasses WebView's iframe-blocking of google.com/maps/embed
const makeMapHtml = (src) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body,html{width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style>
</head><body>
<iframe src="${src}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</body></html>`;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function TypeWriter({ text, active, delay = 0, speed = 26 }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!active || !text) return;
    let i = 0;
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(start);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Text>{out || (active ? '' : text)}</Text>;
}

const DEFAULT_HOURS = {
  0: { closed: true,  open: '10:00', close: '16:00' },
  1: { closed: false, open: '09:00', close: '18:00' },
  2: { closed: false, open: '09:00', close: '18:00' },
  3: { closed: false, open: '09:00', close: '18:00' },
  4: { closed: false, open: '09:00', close: '18:00' },
  5: { closed: false, open: '09:00', close: '19:00' },
  6: { closed: false, open: '09:00', close: '19:00' },
};

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function todayProgress(dh) {
  if (!dh || dh.closed) return null;
  const [oh, om] = dh.open.split(':').map(Number);
  const [ch, cm] = dh.close.split(':').map(Number);
  const now = new Date();
  const nowM  = now.getHours() * 60 + now.getMinutes();
  const openM = oh * 60 + om;
  const clsM  = ch * 60 + cm;
  if (nowM <= openM) return 0;
  if (nowM >= clsM)  return 100;
  return ((nowM - openM) / (clsM - openM)) * 100;
}

function HoursRow({ day, timeText, isToday, isClosed, progress, active, delay }) {
  const { T } = useTheme();
  const hr = useMemo(() => makeHrStyles(T), [T]);
  const barW = useRef(new Animated.Value(0)).current;
  const rowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.timing(rowAnim, {
        toValue: 1,
        duration: 340,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [active]);

  useEffect(() => {
    if (progress !== null) {
      Animated.timing(barW, {
        toValue: progress,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  return (
    <Animated.View style={[
      hr.row, isToday && hr.rowToday,
      {
        opacity: rowAnim,
        transform: [{ translateX: rowAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
      },
    ]}>
      <View style={hr.dayWrap}>
        <Text style={[hr.day, isToday && hr.dayToday]}>{day.toUpperCase()}</Text>
        {isToday && <View style={hr.pip} />}
      </View>
      <View style={hr.dot} />
      <Text style={[hr.time, isClosed && hr.timeClosed]}>
        <TypeWriter text={timeText.toUpperCase()} active={active} delay={delay} speed={26} />
      </Text>
      {isToday && progress !== null && (
        <Animated.View
          style={[
            hr.bar,
            {
              width: barW.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

export default function ContactScreen() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const scrollRef = useRef(null);
  const [info,        setInfo]        = useState(null);
  const [hours,       setHours]       = useState(DEFAULT_HOURS);
  const [hoursActive, setHoursActive] = useState(false);
  const todayIdx = new Date().getDay();

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setHoursActive(false);
      const t = setTimeout(() => setHoursActive(true), 120);
      return () => clearTimeout(t);
    }, [])
  );

  useEffect(() => {
    Promise.all([
      api.get('/shop-info'),
      api.get('/shop-status'),
    ]).then(([infoRes, statusRes]) => {
      setInfo(infoRes.data);
      if (statusRes.data.openingHours) {
        setHours({ ...DEFAULT_HOURS, ...statusRes.data.openingHours });
      }
    }).catch(() => {});
  }, []);

  const address = info?.address || '76 Eastbank Street';
  const fullAddress = [address, info?.city, info?.postcode].filter(Boolean).join(', ');
  // No hardcoded fallbacks here (unlike address) — the website hides each
  // of these entirely when admin clears them (info?.phone && ...), so the
  // app needs to do the same instead of masking a cleared field with an
  // old placeholder value that never goes away.
  const phone  = info?.phone;
  const email  = info?.email;
  const social = info?.instagram;

  const openDirections = () =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    ).catch(() => {});

  const shareAddress = () =>
    Share.share({ message: fullAddress }).catch(() => {});

  return (
    <ScrollView ref={scrollRef} style={s.root} contentContainerStyle={s.content}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.eyebrow}>GET IN TOUCH</Text>
        <Text style={s.title}>FIND US</Text>
        <View style={s.headerRule} />
      </View>

      {/* ── Location ── */}
      <View style={s.block}>
        <Text style={s.blockLabel}>OUR LOCATION</Text>
        <TouchableOpacity onPress={shareAddress} activeOpacity={0.7}>
          <Text style={s.blockTitle}>{address}</Text>
          {(info?.city || info?.postcode) && (
            <Text style={s.addressSub}>
              {[info.city, info.postcode].filter(Boolean).join(' · ')}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={s.copyHint}>Tap address to share</Text>
        <TouchableOpacity onPress={openDirections} activeOpacity={0.7} style={s.directionsRow}>
          <Text style={s.directionsLink}>GET DIRECTIONS →</Text>
        </TouchableOpacity>

        {/* Embedded map — matches website's MapFrame */}
        <View style={s.mapFrame}>
          <WebView
            source={{ html: makeMapHtml(info?.mapEmbedUrl || GOOGLE_MAPS_EMBED_URL) }}
            style={{ flex: 1 }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mixedContentMode="always"
          />
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Opening hours ── */}
      <View style={s.block}>
        <Text style={s.blockLabel}>OPENING HOURS</Text>
        <Text style={s.blockTitle}>WHEN WE'RE HERE</Text>

        <View style={s.hoursList}>
          {DAY_NAMES.map((day, i) => {
            const dh       = hours[i];
            const isToday  = i === todayIdx;
            const timeText = dh?.closed
              ? 'Closed'
              : `${fmtTime(dh?.open)} – ${fmtTime(dh?.close)}`;
            const prog = isToday ? todayProgress(dh) : null;

            return (
              <HoursRow
                key={i}
                day={day}
                timeText={timeText}
                isToday={isToday}
                isClosed={!!dh?.closed}
                progress={prog}
                active={hoursActive}
                delay={i * 80}
              />
            );
          })}
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Contact info ── */}
      <View style={[s.block, { paddingBottom: 50 }]}>
        <Text style={s.blockLabel}>CONTACT INFO</Text>
        <Text style={s.blockTitle}>REACH US</Text>

        <View style={s.infoList}>
          {(() => {
            const rows = [
              phone  && { key: 'phone',  label: 'PHONE',  value: phone,  link: true, onPress: () => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {}) },
              email  && { key: 'email',  label: 'EMAIL',  value: email,  link: true, onPress: () => Linking.openURL(`mailto:${email}`).catch(() => {}) },
              social && { key: 'social', label: 'SOCIAL', value: social },
            ].filter(Boolean);

            return rows.map((row, i) => {
              const rowStyle = [s.infoRow, i === rows.length - 1 && { borderBottomWidth: 0 }];
              if (row.onPress) {
                return (
                  <TouchableOpacity key={row.key} style={rowStyle} activeOpacity={0.7} onPress={row.onPress}>
                    <Text style={s.infoKey}>{row.label}</Text>
                    <Text style={[s.infoVal, row.link && s.infoLink]}>{row.value}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <View key={row.key} style={rowStyle}>
                  <Text style={s.infoKey}>{row.label}</Text>
                  <Text style={s.infoVal}>{row.value}</Text>
                </View>
              );
            });
          })()}
        </View>
      </View>

    </ScrollView>
  );
}

/* ── Hours row styles ── */
function makeHrStyles(T) { return StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    overflow: 'hidden',
  },
  rowToday: { backgroundColor: 'rgba(196, 30, 58, 0.05)' },
  dayWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  day:     { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 2, color: T.text },
  dayToday:{ color: T.red },
  pip:     { width: 6, height: 6, borderRadius: 3, backgroundColor: T.red },
  dot:     { flex: 1, height: 1, backgroundColor: T.border },
  time: {
    fontFamily: T.fontBodyMd, fontSize: 12, letterSpacing: 1,
    color: T.red, minWidth: 110, textAlign: 'right',
  },
  timeClosed: { color: T.textDim },
  bar: {
    position: 'absolute', left: 0, bottom: 0,
    height: 2, backgroundColor: T.red,
  },
}); }

/* ── Screen styles ── */
function makeStyles(T) { return StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.bg },
  content: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  eyebrow: {
    fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4,
    color: T.red, marginBottom: 3, textTransform: 'uppercase',
  },
  title:      { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 2, color: T.text, lineHeight: 44 },
  headerRule: { width: 36, height: 2, backgroundColor: T.red, marginTop: 10 },

  block: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  blockLabel: {
    fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 5,
    color: T.red, marginBottom: 8, textTransform: 'uppercase',
  },
  blockTitle: { fontFamily: T.fontHead, fontSize: 32, letterSpacing: 3, color: T.text, marginBottom: 4 },

  addressSub:    { fontFamily: T.fontBodyMd, fontSize: 14, letterSpacing: 1, color: T.textDim, marginTop: 2 },
  copyHint:      { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textFaint, textTransform: 'uppercase', marginTop: 10 },
  directionsRow: { marginTop: 12 },
  directionsLink: {
    fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', color: T.red,
  },

  mapFrame: {
    marginTop: 20,
    width: SCREEN_W - 48,   // full width minus block padding (24 each side)
    height: (SCREEN_W - 48) * (3 / 4), // 4:3 ratio on mobile (website uses 16:7)
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },

  divider: { height: 1, backgroundColor: T.border },

  infoList: { marginTop: 20 },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: T.border, gap: 20,
  },
  infoKey: {
    fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2,
    color: T.textDim, textTransform: 'uppercase', width: 60, flexShrink: 0, paddingTop: 2,
  },
  infoVal:  { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, flex: 1 },
  infoLink: { color: T.red },

  hoursList: { marginTop: 20 },
}); }
