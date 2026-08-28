import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, Image, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Ellipse, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { resolveImageUrl } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ShopStatusFormModal from '../../components/ShopStatusFormModal';


const { width: W, height: H } = Dimensions.get('window');
const EASE_OUT    = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);
const HERO_H   = Math.min(Math.round(H * 0.58), 540);

const CHAIR_IMG  = require('../../../assets/barberChair.png');
const CHAIR_W    = Math.min(Math.floor((W - 48 - 36) / 2), 120);

// Special Offers badge — mirrors the website's scalloped-seal + ribbon SVG
// (src/pages/Home.jsx) at the same 200/120 aspect ratio.
const OFFER_CREAM    = '#f4f0e8';
const OFFER_W        = Math.min(190, W * 0.5);
const OFFER_H        = OFFER_W * 0.6;
const OFFER_GLOW_W   = OFFER_W * 0.64;
const OFFER_GLOW_H   = OFFER_H * 1.07;
const OFFER_TEXT_SIZE = Math.round(OFFER_W * (16 / 190));
const OFFER_SEAL_PATH = 'M100.0,4.0 L107.8,10.6 L117.3,6.7 L122.7,15.4 L132.9,14.7 L135.4,24.6 L145.3,27.1 L144.6,37.3 L153.3,42.7 L149.4,52.2 L156.0,60.0 L149.4,67.8 L153.3,77.3 L144.6,82.7 L145.3,92.9 L135.4,95.4 L132.9,105.3 L122.7,104.6 L117.3,113.3 L107.8,109.4 L100.0,116.0 L92.2,109.4 L82.7,113.3 L77.3,104.6 L67.1,105.3 L64.6,95.4 L54.7,92.9 L55.4,82.7 L46.7,77.3 L50.6,67.8 L44.0,60.0 L50.6,52.2 L46.7,42.7 L55.4,37.3 L54.7,27.1 L64.6,24.6 L67.1,14.7 L77.3,15.4 L82.7,6.7 L92.2,10.6 Z';

// ── Opening hours fallback ────────────────────────────────────────────────
const DEFAULT_HOURS = {
  0: { closed: true },
  1: { open: '09:00', close: '18:00' },
  2: { open: '09:00', close: '18:00' },
  3: { open: '09:00', close: '18:00' },
  4: { open: '09:00', close: '18:00' },
  5: { open: '09:00', close: '19:00' },
  6: { open: '09:00', close: '19:00' },
};
function computeIsOpen(openingHours) {
  const hours = openingHours || DEFAULT_HOURS;
  const now   = new Date();
  const dh    = hours[now.getDay()];
  if (!dh || dh.closed) return false;
  const [oh, om] = (dh.open  || '00:00').split(':').map(Number);
  const [ch, cm] = (dh.close || '00:00').split(':').map(Number);
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

// ── Wait level ────────────────────────────────────────────────────────────
const WAIT_LEVELS = [
  { id: 1, label: 'Ready for You',   desc: 'Walk right in',     color: '#22c55e' },
  { id: 2, label: 'Short Wait',      desc: 'Grab a seat',       color: '#f59e0b' },
  { id: 3, label: 'Worth the Wait',  desc: "We're pretty busy", color: '#ef4444' },
];
const BAR_GRADIENTS = {
  1: ['#14532d', '#16a34a', '#4ade80'],
  2: ['#14532d', '#22c55e', '#ca8a04', '#fde047'],
  3: ['#14532d', '#22c55e', '#ca8a04', '#ea580c', '#ef4444'],
};
const getWaitLevel = (w) => w <= 10 ? 1 : w <= 25 ? 2 : 3;

// ── Chair card — triangle formation with pulsing radial glow ─────────────
// SpotlightGlow matches the website's:
//   radial-gradient(ellipse at 50% 65%, rgba(196,146,42,0.28) 0%,
//                   rgba(196,30,58,0.1) 40%, transparent 68%)
// Using SVG RadialGradient (react-native-svg) for a true radial fade — no hard circle edge.
function ChairCard({ name, active, glowAnim }) {
  const { T } = useTheme();
  const cs = useMemo(() => makeCsStyles(T), [T]);
  const GLOW_W = CHAIR_W + 40;
  const CHAIR_H = Math.round(CHAIR_W / 0.75);
  const GLOW_H = CHAIR_H + 40;

  return (
    <View style={[cs.chair, !active && { opacity: 0.30 }]}>
      <View style={[cs.chairImgWrap, { height: CHAIR_H }]}>
        {active && (
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', left: -20, top: -20, opacity: glowAnim }}
          >
            <Svg width={GLOW_W} height={GLOW_H}>
              <Defs>
                <RadialGradient id="sg" cx="50%" cy="65%" r="68%" fx="50%" fy="65%">
                  <Stop offset="0%"   stopColor="#C4922A" stopOpacity="0.28" />
                  <Stop offset="40%"  stopColor="#C41E3A" stopOpacity="0.10" />
                  <Stop offset="68%"  stopColor="#000000" stopOpacity="0" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={GLOW_W / 2} cy={GLOW_H * 0.65}
                rx={GLOW_W / 2} ry={GLOW_H / 2}
                fill="url(#sg)"
              />
            </Svg>
          </Animated.View>
        )}
        <Image
          source={CHAIR_IMG}
          style={cs.chairImg}
          resizeMode="contain"
        />
      </View>
      <Text style={[cs.chairName, !active && { color: T.textFaint }]}>
        {name || ''}
      </Text>
    </View>
  );
}

function makeCsStyles(T) { return StyleSheet.create({
  chair:        { alignItems: 'center', gap: 10 },
  chairImgWrap: { width: CHAIR_W },
  chairImg:     { width: '100%', height: '100%' },
  chairName:    { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 3, color: T.text, textAlign: 'center' },
}); }

// ── Main screen ───────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { T, isDark } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const { isShopUser, isAdmin } = useAuth();
  // STAFF-only accounts don't have a Play tab (see AppNavigator's role-based
  // tab set) — hide the CTA that links to it rather than leave a dead tap.
  const canPlay = !isShopUser || isAdmin;
  const [showStatusEdit, setShowStatusEdit] = useState(false);

  // Hero
  const [heroImages,  setHeroImages]  = useState([]);
  const [slideIdx,    setSlideIdx]    = useState(0);
  const [displayIdx,  setDisplayIdx]  = useState(0);
  const [outgoingIdx, setOutgoingIdx] = useState(null);
  const displayIdxRef = useRef(0);
  const isAnimRef     = useRef(false);
  const slideX        = useRef(new Animated.Value(0)).current;
  const slideOp       = useRef(new Animated.Value(1)).current;
  const outX          = useRef(new Animated.Value(0)).current;
  const outOp         = useRef(new Animated.Value(1)).current;
  const slideTimer    = useRef(null);

  // Shop status
  const [shopStatus, setShopStatus] = useState({ isOpen: false, barbers: [], waitTime: 0 });

  // Chair glow animations (staggered to match website's pulseDelay: 0, 0.6s, 1.2s)
  const glow0 = useRef(new Animated.Value(0.4)).current;
  const glow1 = useRef(new Animated.Value(0.4)).current;
  const glow2 = useRef(new Animated.Value(0.4)).current;

  // Special Offers badge pulse — a single driver value for both the badge's
  // own scale AND its glow layer's opacity/scale, so they're synced by
  // construction (not two independently-timed animations that can drift,
  // which is what actually went wrong on the website version of this).
  const offerPulse = useRef(new Animated.Value(0)).current;

  // Bar fill
  const barAnim    = useRef(new Animated.Value(0)).current;
  const [barTrackW, setBarTrackW] = useState(0);

  // Entrance animations (replaces MotiView stagger)
  const eTag0  = useRef(new Animated.Value(0)).current;
  const eTag1  = useRef(new Animated.Value(0)).current;
  const eTag2  = useRef(new Animated.Value(0)).current;
  const eTitle = useRef(new Animated.Value(0)).current;
  const eCta   = useRef(new Animated.Value(0)).current;
  const eGal   = useRef(new Animated.Value(0)).current;
  const eWhat  = useRef(new Animated.Value(0)).current;

  // ScrollView ref — scroll to top on tab focus + "Who's In Today" CTA
  const scrollRef = useRef(null);
  const [availY,  setAvailY]  = useState(0);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // ── Fetch hero images — retry up to 5x for Render cold starts ────────────
  useEffect(() => {
    let retryTimeout;
    let retries = 0;
    const MAX_RETRIES = 5;

    const fetchImages = () => {
      api.get('/hero-slideshow/public')
        .then(r => {
          const imgs = r.data.images || [];
          setHeroImages(imgs);
          if (imgs.length > 0) {
            const def = imgs.findIndex(i => i.isDefault);
            if (def > 0) { setSlideIdx(def); setDisplayIdx(def); displayIdxRef.current = def; }
          } else if (retries < MAX_RETRIES) {
            retries++;
            retryTimeout = setTimeout(fetchImages, 8000);
          }
        })
        .catch(() => {
          if (retries < MAX_RETRIES) {
            retries++;
            retryTimeout = setTimeout(fetchImages, 8000);
          }
        });
    };

    fetchImages();
    return () => clearTimeout(retryTimeout);
  }, []);

  // ── Poll shop status every 10 s ─────────────────────────────────────────
  const fetchShopStatus = useCallback(() => {
    api.get('/shop-status')
      .then(r => {
        const { isOpen, override, barbers: bs, waitTime, openingHours } = r.data;
        setShopStatus({
          isOpen:   override ? isOpen : computeIsOpen(openingHours),
          barbers:  bs || [],
          waitTime: waitTime || 0,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchShopStatus();
    const id = setInterval(fetchShopStatus, 10000);
    return () => clearInterval(id);
  }, [fetchShopStatus]);

  // ── Chair glow pulse (staggered, mirroring website's pulseDelay) ─────────
  useEffect(() => {
    const timers = [];
    [[glow0, 0], [glow1, 600], [glow2, 1200]].forEach(([anim, delay]) => {
      const t = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.9, duration: 1300, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.4, duration: 1300, useNativeDriver: true }),
          ])
        ).start();
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Special Offers badge pulse (native-driven, immune to JS re-renders) ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(offerPulse, { toValue: 1, duration: 1300, easing: EASE_IN_OUT, useNativeDriver: true }),
        Animated.timing(offerPulse, { toValue: 0, duration: 1300, easing: EASE_IN_OUT, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const offerBadgeScale = offerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const offerGlowScale  = offerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const offerGlowOpacity = offerPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  // ── Derived availability state ───────────────────────────────────────────
  const { isOpen, barbers: activeBarbers, waitTime } = shopStatus;
  const waitLevel = isOpen ? getWaitLevel(waitTime) : 0;
  const current   = WAIT_LEVELS.find(l => l.id === waitLevel);
  const chairs    = [activeBarbers[0] || '', activeBarbers[1] || '', activeBarbers[2] || ''];

  // ── Bar fill animation (runs when track is measured or status changes) ────
  useEffect(() => {
    if (!barTrackW || !isOpen || !waitLevel) return;
    const frac = waitLevel === 1 ? 0.333 : waitLevel === 2 ? 0.666 : 1;
    Animated.timing(barAnim, {
      toValue: barTrackW * frac,
      duration: 1100,
      useNativeDriver: false,
    }).start();
  }, [barTrackW, waitLevel, isOpen]);

  // ── Hero directional slide + crossfade (matches website's AnimatePresence) ─
  // Entering image starts at opacity 0 so any 1-frame position lag is invisible.
  // Exiting image fades out as it slides away — exactly what the website does.
  const slideTo = useCallback((newIdx, dir = 1) => {
    const curIdx = displayIdxRef.current;
    if (newIdx === curIdx) return;
    if (isAnimRef.current) {
      slideX.stopAnimation(); slideOp.stopAnimation();
      outX.stopAnimation();   outOp.stopAnimation();
      outX.setValue(0); outOp.setValue(1);
      slideX.setValue(0); slideOp.setValue(1);
      setOutgoingIdx(null);
      displayIdxRef.current = newIdx;
      setDisplayIdx(newIdx);
      isAnimRef.current = false;
      return;
    }
    isAnimRef.current = true;
    // Position + opacity set BEFORE state updates — incoming is invisible & off-screen.
    // key={displayIdx} on the Animated.Image forces a fresh native view on each transition,
    // so the view starts with exactly these initial values and can't briefly show stale pixels.
    outX.setValue(0); outOp.setValue(1);
    slideX.setValue(dir * W); slideOp.setValue(0);
    setOutgoingIdx(curIdx);
    displayIdxRef.current = newIdx;
    setDisplayIdx(newIdx);
    // requestAnimationFrame lets React flush the new views to the native side before
    // the animation starts — guarantees the initial positions are painted first.
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(outX,    { toValue: -dir * W, duration: 500, easing: EASE_OUT, useNativeDriver: false }),
        Animated.timing(outOp,   { toValue: 0,         duration: 380, easing: EASE_OUT, useNativeDriver: false }),
        Animated.timing(slideX,  { toValue: 0,          duration: 500, easing: EASE_OUT, useNativeDriver: false }),
        Animated.timing(slideOp, { toValue: 1,          duration: 500, easing: EASE_OUT, useNativeDriver: false }),
      ]).start(({ finished }) => {
        if (finished) { setOutgoingIdx(null); outX.setValue(0); outOp.setValue(1); slideOp.setValue(1); }
        isAnimRef.current = false;
      });
    });
  }, [slideX, slideOp, outX, outOp]);

  const goToSlide = (i, dir = 1) => {
    clearInterval(slideTimer.current);
    setSlideIdx(i);
    slideTo(i, dir);
  };
  const goPrev = () => {
    const newIdx = (displayIdxRef.current - 1 + heroImages.length) % heroImages.length;
    goToSlide(newIdx, -1);
  };
  const goNext = () => {
    const newIdx = (displayIdxRef.current + 1) % heroImages.length;
    goToSlide(newIdx, 1);
  };

  // Staggered entrance (mirrors MotiView delays from website)
  useEffect(() => {
    const mk = (anim, delay, duration) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true })]);
    Animated.parallel([
      mk(eTag0,  150, 550),
      mk(eTag1,  250, 550),
      mk(eTag2,  350, 550),
      mk(eTitle, 300, 850),
      mk(eCta,   880, 550),
      mk(eGal,   100, 500),
      mk(eWhat,  200, 500),
    ]).start();
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    slideTimer.current = setInterval(() => {
      const next = (displayIdxRef.current + 1) % heroImages.length;
      setSlideIdx(next);
      slideTo(next, 1);
    }, 4000);
    return () => clearInterval(slideTimer.current);
  }, [heroImages.length, slideTo]);

  return (
    <SafeAreaView style={s.safe} edges={[]}>

      <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero carousel ──────────────────────────────────────── */}
        <View style={s.heroWrap}>
          {outgoingIdx !== null && heroImages[outgoingIdx] && (
            <Animated.Image
              source={{ uri: resolveImageUrl(heroImages[outgoingIdx].imageUrl) }}
              style={[s.heroImg, { transform: [{ translateX: outX }], opacity: outOp }]}
              resizeMode="cover"
            />
          )}
          {heroImages[displayIdx] ? (
            <Animated.Image
              key={displayIdx}
              source={{ uri: resolveImageUrl(heroImages[displayIdx].imageUrl) }}
              style={[s.heroImg, { transform: [{ translateX: slideX }], opacity: slideOp }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.heroImg, { backgroundColor: T.card }]} />
          )}

          <LinearGradient
            colors={['transparent', isDark ? 'rgba(14,17,24,0.6)' : 'rgba(244,240,232,0.6)', T.bg]}
            style={s.heroGradient}
          />

          {/* Title overlaid at bottom of hero — staggered entry animations */}
          <View style={s.heroContent}>
            <View style={s.tagRow}>
              {[['PRECISION', eTag0], ['CRAFT', eTag1], ['STYLE', eTag2]].map(([w, a]) => (
                <Animated.View
                  key={w}
                  style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}
                >
                  <Text style={s.tag}>{w}</Text>
                </Animated.View>
              ))}
            </View>
            <Animated.View
              style={{ opacity: eTitle, transform: [{ translateY: eTitle.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }}
            >
              <Text style={s.heroTitle}>
                LEV<Text style={{ color: T.red }}>3</Text>L{'\n'}BARBERS
              </Text>
            </Animated.View>
          </View>

          {/* Prev / Next arrows */}
          {heroImages.length > 1 && (
            <>
              <TouchableOpacity style={[s.arrowBtn, { left: 12 }]} onPress={goPrev} activeOpacity={0.7}>
                <Text style={s.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.arrowBtn, { right: 12 }]} onPress={goNext} activeOpacity={0.7}>
                <Text style={s.arrowText}>›</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Dot indicators */}
          {heroImages.length > 1 && (
            <View style={s.dots}>
              {heroImages.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
                  <View style={[s.dot, i === slideIdx && s.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── CTA row ────────────────────────────────────────────── */}
        <Animated.View
          style={[s.ctaRow, { opacity: eCta, transform: [{ translateY: eCta.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
        >
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => scrollRef.current?.scrollTo({ y: availY, animated: true })}
            activeOpacity={0.8}
          >
            <Text style={s.primaryBtnText}>Who's In Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.ghostBtn}
            onPress={() => navigation.navigate('Services')}
            activeOpacity={0.8}
          >
            <Text style={s.ghostBtnText}>Our Services</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.offerBtnWrap}>
          <TouchableOpacity
            style={s.offerBtnTouchable}
            onPress={() => navigation.navigate('WhatsOn', { filter: 'PROMOTION' })}
            activeOpacity={0.85}
          >
            <Animated.View
              pointerEvents="none"
              style={[s.offerGlow, { opacity: offerGlowOpacity, transform: [{ scale: offerGlowScale }] }]}
            >
              <Svg width={OFFER_GLOW_W} height={OFFER_GLOW_H}>
                <Defs>
                  <RadialGradient id="offerGlow" cx="50%" cy="50%" r="60%">
                    <Stop offset="0%"  stopColor={T.red} stopOpacity="0.55" />
                    <Stop offset="45%" stopColor={T.red} stopOpacity="0.16" />
                    <Stop offset="72%" stopColor={T.red} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Ellipse
                  cx={OFFER_GLOW_W / 2} cy={OFFER_GLOW_H / 2}
                  rx={OFFER_GLOW_W / 2} ry={OFFER_GLOW_H / 2}
                  fill="url(#offerGlow)"
                />
              </Svg>
            </Animated.View>

            <Animated.View style={{ width: OFFER_W, height: OFFER_H, transform: [{ scale: offerBadgeScale }] }}>
              <Svg width={OFFER_W} height={OFFER_H} viewBox="0 0 200 120">
                <Defs>
                  <SvgLinearGradient id="offerRibbonGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#e14f68" />
                    <Stop offset="55%" stopColor={T.red} />
                    <Stop offset="100%" stopColor="#8f1626" />
                  </SvgLinearGradient>
                </Defs>
                <Path d="M0,44 L56,44 L56,76 L0,76 L14,60 Z" fill="url(#offerRibbonGradient)" />
                <Path d="M144,44 L200,44 L186,60 L200,76 L144,76 Z" fill="url(#offerRibbonGradient)" />
                <Path
                  d={OFFER_SEAL_PATH}
                  fill={OFFER_CREAM}
                  stroke={T.red}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </Svg>
              <View style={s.offerLabel} pointerEvents="none">
                <Text style={s.offerText}>SPECIAL</Text>
                <Text style={s.offerText}>OFFERS</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* ── Who's In Today ─────────────────────────────────────── */}
        <View
          style={s.availSection}
          onLayout={e => setAvailY(e.nativeEvent.layout.y)}
        >
          <Text style={s.availTitle}>Who's In Today</Text>
          <View style={s.availRule} />

          <View style={s.panels}>

            {/* Barbers panel */}
            <View style={s.panel}>
              <Text style={s.panelLabel}>Available Barbers</Text>

              <View style={s.triangleWrap}>
                <View style={s.topRow}>
                  <ChairCard name={isOpen ? chairs[0] : 'Closed'} active={isOpen && !!chairs[0]} glowAnim={glow0} />
                  <ChairCard name={isOpen ? chairs[1] : 'Closed'} active={isOpen && !!chairs[1]} glowAnim={glow1} />
                </View>
                <View style={s.bottomRow}>
                  <ChairCard name={isOpen ? chairs[2] : 'Closed'} active={isOpen && !!chairs[2]} glowAnim={glow2} />
                </View>
              </View>
            </View>

            {/* Divider */}
            <LinearGradient
              colors={['transparent', T.border, T.border, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.panelDivider}
            />

            {/* Wait level panel */}
            <View style={s.panel}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.panelLabel}>Waiting Level</Text>
                {isShopUser && (
                  <TouchableOpacity
                    style={s.editStatusBtn}
                    onPress={() => setShowStatusEdit(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="create-outline" size={13} color={T.textDim} />
                    <Text style={s.editStatusBtnText}>EDIT STATUS</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isOpen ? (
                <View>
                  <Text style={s.closedTitle}>We're closed right now.</Text>
                  <Text style={s.closedSub}>Check back during opening hours.</Text>
                </View>
              ) : (
                <View>
                  <View
                    style={s.barTrack}
                    onLayout={e => setBarTrackW(e.nativeEvent.layout.width)}
                  >
                    <Animated.View style={[s.barFillWrap, { width: barAnim }]}>
                      <LinearGradient
                        colors={BAR_GRADIENTS[waitLevel] || BAR_GRADIENTS[1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient
                        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>

                  <View style={s.barScale}>
                    <Text style={s.scaleTick}>Low</Text>
                    <Text style={[s.scaleTick, { textAlign: 'center' }]}>Medium</Text>
                    <Text style={[s.scaleTick, { textAlign: 'right' }]}>High</Text>
                  </View>

                  <Text style={[s.statusText, { color: current?.color }]}>{current?.label}</Text>
                  <Text style={s.statusDesc}>{current?.desc}</Text>

                  {canPlay && (
                    <TouchableOpacity
                      style={s.snakeCard}
                      onPress={() => navigation.navigate('Play')}
                      activeOpacity={0.82}
                    >
                      <Ionicons name="game-controller-outline" size={20} color="#42a5f5" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.snakeCardTitle}>Think you can top the board?</Text>
                        <Text style={s.snakeCardSub}>Snake & Ping Pong · weekly prize up for grabs</Text>
                      </View>
                      <Text style={s.snakeCardArrow}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

          </View>
        </View>

        {/* ── Discover section ───────────────────────────────────── */}
        <View style={s.discoverSection}>
          <Text style={s.discoverEyebrow}>EXPLORE MORE</Text>
          <Text style={s.discoverTitle}>Discover</Text>
          <View style={s.discoverRule} />
          <View style={s.discoverCards}>
            <Animated.View
              style={{ flex: 1, opacity: eGal, transform: [{ translateX: eGal.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}
            >
              <TouchableOpacity
                style={s.discoverCard}
                onPress={() => navigation.navigate('Gallery')}
                activeOpacity={0.82}
              >
                <Text style={s.discoverCardIcon}>◧</Text>
                <Text style={s.discoverCardTitle}>Gallery</Text>
                <Text style={s.discoverCardSub}>See our work</Text>
                <Text style={s.discoverCardArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={{ flex: 1, opacity: eWhat, transform: [{ translateX: eWhat.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
            >
              <TouchableOpacity
                style={s.discoverCard}
                onPress={() => navigation.navigate('WhatsOn')}
                activeOpacity={0.82}
              >
                <Text style={s.discoverCardIcon}>⊞</Text>
                <Text style={s.discoverCardTitle}>What's On</Text>
                <Text style={s.discoverCardSub}>News & promos</Text>
                <Text style={s.discoverCardArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {isShopUser && (
        <ShopStatusFormModal
          visible={showStatusEdit}
          onClose={() => setShowStatusEdit(false)}
          onSaved={() => { setShowStatusEdit(false); fetchShopStatus(); }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },

  // Hero
  heroWrap:     { height: HERO_H, overflow: 'hidden' },
  heroImg:      { width: '100%', height: '100%', position: 'absolute' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 },
  heroContent:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 44 },
  tagRow:       { flexDirection: 'row', gap: 16, marginBottom: 10 },
  tag:          { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim },
  heroTitle:    { fontFamily: T.fontHead, fontSize: 56, letterSpacing: 2, color: T.text, lineHeight: 58 },

  arrowBtn:     {
    position: 'absolute', top: '50%', marginTop: -20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(26,26,26,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText:    { color: '#f4f0e8', fontSize: 26, lineHeight: 30, marginTop: -2 },

  dots:      { position: 'absolute', bottom: 14, right: 20, flexDirection: 'row', gap: 6 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: T.textFaint },
  dotActive: { backgroundColor: T.red, width: 18 },

  // CTAs (matches website's BtnRow)
  ctaRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 18 },
  primaryBtn:     { flex: 1, backgroundColor: T.red, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 2, color: '#fff', textTransform: 'uppercase' },
  ghostBtn:       { flex: 1, borderWidth: 1, borderColor: T.borderMd, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText:   { fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 2, color: T.text, textTransform: 'uppercase' },
  offerBtnWrap: { alignItems: 'center', paddingBottom: 20, marginTop: -6 },
  offerBtnTouchable: { width: OFFER_W, height: OFFER_H },
  offerGlow: {
    position: 'absolute',
    left: (OFFER_W - OFFER_GLOW_W) / 2,
    top:  (OFFER_H - OFFER_GLOW_H) / 2,
  },
  offerLabel: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  offerText: {
    fontFamily: T.fontBodyBd, fontSize: OFFER_TEXT_SIZE, letterSpacing: 0.5,
    color: T.red, lineHeight: OFFER_TEXT_SIZE * 1.15,
  },

  // Availability section
  availSection: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 56, borderTopWidth: 1, borderTopColor: T.border },
  availTitle:   { fontFamily: T.fontHead, fontSize: 52, letterSpacing: -0.5, lineHeight: 54, color: T.text },
  availRule:    { width: 48, height: 2, backgroundColor: T.red, marginTop: 14, marginBottom: 40 },

  panels:       { flexDirection: 'column' },
  panel:        { paddingBottom: 40 },
  panelDivider: { height: 1, marginBottom: 40 },

  panelLabel:   { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 3, color: T.textDim, marginBottom: 28 },
  editStatusBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 28 },
  editStatusBtnText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1.5, color: T.textDim },

  closedTitle:  { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.textDim, lineHeight: 30 },
  closedSub:    { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textFaint, textTransform: 'uppercase', marginTop: 8 },

  // Chair triangle
  triangleWrap: { alignItems: 'center', gap: 16 },
  topRow:       { flexDirection: 'row', gap: 36 },
  bottomRow:    { flexDirection: 'row', justifyContent: 'center' },

  // Wait bar
  barTrack:    { height: 18, backgroundColor: T.surface, borderRadius: 6, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 8 },
  barFillWrap: { height: '100%', borderRadius: 6, overflow: 'hidden' },
  barScale:    { flexDirection: 'row', marginBottom: 24 },
  scaleTick:   { flex: 1, fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' },
  statusText:  { fontFamily: T.fontHead, fontSize: 46, letterSpacing: 0, lineHeight: 48 },
  statusDesc:  { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginTop: 4 },

  // Discover section
  discoverSection:   { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 52, borderTopWidth: 1, borderTopColor: T.border },
  discoverEyebrow:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 4 },
  discoverTitle:     { fontFamily: T.fontHead, fontSize: 44, letterSpacing: -0.5, lineHeight: 46, color: T.text },
  discoverRule:      { width: 36, height: 2, backgroundColor: T.red, marginTop: 14, marginBottom: 28 },
  discoverCards:     { flexDirection: 'row', gap: 12 },
  discoverCard:      { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 20, flex: 1 },
  discoverCardIcon:  { fontSize: 28, color: T.red, marginBottom: 10 },
  discoverCardTitle: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 2, color: T.text, marginBottom: 4 },
  discoverCardSub:   { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, marginBottom: 16 },
  discoverCardArrow: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.red, letterSpacing: 1 },

  snakeCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  snakeCardTitle: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  snakeCardSub:   { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginTop: 2 },
  snakeCardArrow: { fontFamily: T.fontBodyMd, fontSize: 16, color: T.textDim },
}); }
