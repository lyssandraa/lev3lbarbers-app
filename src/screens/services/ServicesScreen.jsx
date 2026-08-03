import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import PriceCountUp from '../../components/PriceCountUp';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';

const INTRO_DEFAULT =
  'Crafted for every man. We cater to all hair types — afro, curly, straight and more. Other services available upon request.';

function fmtPrice(price) {
  const n = parseFloat(price);
  return `£${n % 1 === 0 ? Math.round(n) : n.toFixed(2)}`;
}

function ServiceCard({ item, index, loggedIn }) {
  const { T, isDark } = useTheme();
  const cs = useMemo(() => makeCardStyles(T, isDark), [T, isDark]);
  const num = String(index + 1).padStart(2, '0');
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }}>
    <View style={cs.card}>
      {/* Ghost number — subtle decoration matching website */}
      <Text style={cs.ghost} numberOfLines={1}>{num}</Text>

      <View style={cs.content}>
        <Text style={cs.num}>{num}</Text>
        <View style={cs.rule} />
        <Text style={cs.name}>{item.name?.toUpperCase()}</Text>
        {item.description ? (
          <Text style={cs.desc}>{item.description}</Text>
        ) : null}
        <View style={cs.priceLine}>
          {loggedIn && item.price != null ? (
            <PriceCountUp price={item.price} style={cs.price} />
          ) : (
            <Text style={cs.locked}>MEMBERS ONLY</Text>
          )}
        </View>
      </View>
    </View>
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const navigation              = useNavigation();
  const scrollRef               = useRef(null);
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loggedIn,  setLoggedIn]  = useState(false);
  const [intro,     setIntro]     = useState(INTRO_DEFAULT);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    api.get('/shop-info').then(r => {
      if (r.data?.servicesIntro) setIntro(r.data.servicesIntro);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        setLoggedIn(!!token);
        if (token) {
          try {
            const r = await api.get('/services/all-services');
            setServices(r.data.allServices || []);
            return;
          } catch (err) {
            if (!err.response || (err.response.status !== 401 && err.response.status !== 403)) throw err;
          }
        }
        const r = await api.get('/services/public-services');
        setServices(r.data.services || []);
      } catch {
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ScrollView ref={scrollRef} style={s.root} contentContainerStyle={s.content}>
      {/* Page header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>THE MENU</Text>
        <Text style={s.title}>OUR SERVICES</Text>
        <Text style={s.sub}>{intro}</Text>
      </View>

      {/* Service grid */}
      {loading ? (
        <ActivityIndicator color={T.red} style={{ marginTop: 48 }} />
      ) : services.length === 0 ? (
        <Text style={s.empty}>Service menu coming soon — stay tuned.</Text>
      ) : (
        <View style={s.grid}>
          {services.map((svc, i) => (
            <ServiceCard key={svc.id} item={svc} index={i} loggedIn={loggedIn} />
          ))}
        </View>
      )}

      {/* Unlock CTA for guests */}
      {!loggedIn && !loading && services.length > 0 && (
        <View style={s.unlock}>
          <Text style={s.unlockEyebrow}>MEMBERS ONLY</Text>
          <Text style={s.unlockTitle}>UNLOCK FULL PRICING</Text>
          <View style={s.unlockRule} />
          <Text style={s.unlockText}>
            Sign up free and see our full price menu — plus access to exclusive
            member deals. Takes less than 60 seconds.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={s.primaryBtnText}>JOIN THE CLUB</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.ghostBtn}>Already a member? Sign in</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

/* ─── Card styles ─── */
function makeCardStyles(T, isDark) { return StyleSheet.create({
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ghost: {
    position: 'absolute',
    top: -14,
    right: 4,
    fontFamily: T.fontHead,
    fontSize: 96,
    color: isDark ? 'rgba(96, 165, 250, 0.09)' : 'rgba(196, 30, 58, 0.07)',
    lineHeight: 96,
    pointerEvents: 'none',
  },
  content: { padding: 24, position: 'relative', zIndex: 1 },
  num: {
    fontFamily: T.fontHead,
    fontSize: 28,
    color: isDark ? '#60a5fa' : T.red,
    letterSpacing: 2,
  },
  rule: { width: 32, height: 1.5, backgroundColor: T.borderMd, marginVertical: 12 },
  name: { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 3, color: T.text, marginBottom: 8, lineHeight: 30 },
  desc: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 20, marginBottom: 12 },
  priceLine: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14, marginTop: 4 },
  price:  { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 2, color: T.text },
  locked: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 3, color: T.textDim },
}); }

/* ─── Screen styles ─── */
function makeStyles(T) { return StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.bg },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 36 },
  eyebrow: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontFamily: T.fontHead, fontSize: 64, letterSpacing: 4, color: T.text, lineHeight: 64, marginBottom: 16 },
  sub: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, lineHeight: 22, maxWidth: 320 },

  grid: { paddingHorizontal: 24 },

  empty: { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },

  unlock: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    padding: 36,
    marginHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  unlockEyebrow: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 3, color: T.red, textTransform: 'uppercase' },
  unlockTitle:   { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 4, color: T.text, textAlign: 'center' },
  unlockRule:    { width: 40, height: 1.5, backgroundColor: T.borderMd },
  unlockText: {
    fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, textAlign: 'center',
    lineHeight: 22, maxWidth: 280,
  },
  primaryBtn: { backgroundColor: T.red, paddingHorizontal: 36, paddingVertical: 14, marginTop: 4 },
  primaryBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: '#fff', textTransform: 'uppercase' },
  ghostBtn: {
    fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 1.5, color: T.textDim,
    textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 2,
  },
}); }
