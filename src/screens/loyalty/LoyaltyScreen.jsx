import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Confetti from '../../components/Confetti';

// Choose columns to avoid a single orphaned stamp on the last row
function bestCols(n) {
  if (n <= 6) return n;   // 1-6  → single row
  if (n <= 8) return 4;   // 7-8  → 4+3 or 4+4
  return 6;               // 9    → 6+3 (user's preferred layout)
}
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TIER_GRADIENTS = {
  BRONZE:   ['#6b4423', '#b97a3c'],
  SILVER:   ['#5b6470', '#9aa4b2'],
  GOLD:     ['#7a5a10', '#C4922A'],
  PLATINUM: ['#454c56', '#8d99ab'],
};
const TIER_ACCENTS = {
  BRONZE: '#e0b27a', SILVER: '#dde2e8', GOLD: '#ffe08a', PLATINUM: '#eef2f9',
};
const NEXT_TIER = {
  BRONZE: 'Silver', SILVER: 'Gold', GOLD: 'Platinum', PLATINUM: 'Platinum completed',
};

export default function LoyaltyScreen({ navigation }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const { user, isShopUser } = useAuth();
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [face,         setFace]         = useState('front'); // front | back
  const [showQR,       setShowQR]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-show the QR modal whenever this tab is focused
  useFocusEffect(
    useCallback(() => {
      if (user && !isShopUser) setShowQR(true);
    }, [user, isShopUser])
  );

  useEffect(() => {
    if (!user || isShopUser) { setLoading(false); return; }
    setLoading(true);
    api.get('/stamps/me')
      .then(r => {
        setData(r.data);
        if (r.data.pendingRewards?.length > 0) setShowConfetti(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isShopUser]);

  if (isShopUser) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.title}>LOYALTY CARD</Text>
          <Text style={s.sub}>Staff accounts don't have a loyalty card.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.title}>LOYALTY CARD</Text>
          <View style={s.rule} />
          <Text style={s.sub}>Sign in to view your loyalty card, stamps, and tier rewards.</Text>
          <TouchableOpacity style={s.signInBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <Text style={s.signInBtnText}>SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.signUpLink} onPress={() => navigation.navigate('Signup')}>
            <Text style={s.signUpLinkText}>No account? Sign up free</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={T.gold} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.title}>LOYALTY CARD</Text>
          <Text style={s.sub}>Could not load loyalty data. Please check your connection.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    tier = 'BRONZE',
    stampsInCycle = 0,
    stampCycle = 0,
    stampsToNextTier,
    stampsToNextReward,
    nextMilestone,
    tierMin = 0,
    tierMax = 9,
    cycleLength = 50,
    pendingRewards = [],
    expiringRewards = [],
  } = data;

  const gradient = TIER_GRADIENTS[tier] || TIER_GRADIENTS.BRONZE;
  const accent   = TIER_ACCENTS[tier]   || TIER_ACCENTS.BRONZE;
  const tierSpan = Math.max(tierMax - tierMin + 1, 1);
  const tierProgress = Math.min((stampsInCycle - tierMin + 1) / tierSpan, 1);
  const soonest  = expiringRewards[0];
  const daysLeft = soonest
    ? Math.ceil((new Date(soonest.expiresAt) - Date.now()) / 86400000)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {showConfetti && (
        <Confetti
          count={45}
          colors={['#C41E3A', '#C4922A', '#ffffff', TIER_ACCENTS[tier] || '#ffe08a']}
          onDone={() => setShowConfetti(false)}
        />
      )}

      {/* QR pop-up modal — auto-shows on tab focus so customer can quickly show their code */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <Pressable style={s.qrModal} onPress={() => setShowQR(false)}>
          <Pressable style={s.qrModalCard} onPress={() => {}}>
            <Text style={s.qrModalEye}>MY LOYALTY QR</Text>
            <Text style={s.qrModalName}>{user?.name || 'Customer'}</Text>
            <View style={s.qrModalWrap}>
              <QRCode
                value={user?.email || 'no-email'}
                size={220}
                backgroundColor="#ffffff"
                color="#1a1a1a"
                ecl="H"
                logo={require('../../../assets/icon.png')}
                logoSize={48}
                logoBackgroundColor="#ffffff"
                logoMargin={4}
                logoBorderRadius={8}
              />
            </View>
            <Text style={s.qrModalHint}>Show this to your barber to collect stamps</Text>
            <TouchableOpacity style={s.qrModalClose} onPress={() => setShowQR(false)} activeOpacity={0.8}>
              <Text style={s.qrModalCloseText}>VIEW LOYALTY CARD</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.eyebrow}>MY LOYALTY CARD</Text>

        {/* ── Card ── */}
        <TouchableOpacity onPress={() => setShowQR(true)} activeOpacity={0.92}>
          <LinearGradient colors={gradient} style={s.card}>

            {face === 'front' ? (
              <>
                {/* Top row */}
                <View style={s.topRow}>
                  <View style={[s.tierBadge, { backgroundColor: accent }]}>
                    <Text style={s.tierBadgeText}>{tier}</Text>
                  </View>
                  {stampCycle > 0 && (
                    <Text style={[s.cycleTag, { color: accent }]}>Platinum Graduate ×{stampCycle}</Text>
                  )}
                  <Text style={[s.stampCount, { color: accent }]}>{stampsInCycle} / {cycleLength}</Text>
                </View>

                {/* Progress bar */}
                <View style={s.progressSection}>
                  <View style={s.progressMeta}>
                    <Text style={s.progressLabel}>Tier progress</Text>
                    <Text style={s.progressLabel}>
                      {tier === 'PLATINUM'
                        ? `${cycleLength - stampsInCycle} to complete cycle`
                        : `${stampsToNextTier ?? '?'} to ${NEXT_TIER[tier] || 'next tier'}`}
                    </Text>
                  </View>
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${tierProgress * 100}%`, backgroundColor: accent }]} />
                    <View style={[s.milestone, { left: '33.3%' }]} />
                    <View style={[s.milestone, { left: '66.6%' }]} />
                  </View>
                </View>

                {/* Reward hint */}
                <Text style={[s.rewardHint, { color: accent }]}>
                  {stampsToNextReward === 1
                    ? '1 more stamp until your next reward'
                    : `${stampsToNextReward ?? 3} stamps until next reward`}
                  {nextMilestone ? ` · stamp #${nextMilestone}` : ''}
                </Text>

                {/* Expiry warning */}
                {soonest && daysLeft !== null && daysLeft <= 14 && (
                  <View style={s.expiryWarn}>
                    <Text style={s.expiryWarnText}>
                      ⚠ Reward expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — visit soon!
                    </Text>
                  </View>
                )}

                {/* Pending rewards */}
                {pendingRewards.length > 0 && (
                  <View style={s.pendingBox}>
                    <Text style={s.pendingTitle}>Ready to collect at your next visit</Text>
                    {pendingRewards.map(r => (
                      <Text key={r.id} style={s.pendingItem}>• {r.rewardValue || r.rewardType}</Text>
                    ))}
                  </View>
                )}

                {/* Stamps — smart grid: no single orphan at the bottom */}
                {(() => {
                  const count = Math.min(9, tierSpan);
                  const cols  = bestCols(count);
                  const items = Array.from({ length: count }, (_, i) => {
                    const stamp = tierMin + i;
                    return { stamp, filled: stampsInCycle >= stamp, milestone: stamp % 3 === 0 };
                  });
                  const rows = [];
                  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
                  return (
                    <View style={s.stampsGrid}>
                      {rows.map((row, ri) => (
                        <View key={ri} style={s.stampRow}>
                          {row.map(({ stamp, filled, milestone }, si) => (
                            <View
                              key={si}
                              style={[
                                s.dot,
                                { borderColor: milestone ? accent : 'rgba(244,240,232,0.3)' },
                                filled && { backgroundColor: accent },
                              ]}
                            >
                              {filled ? (
                                <Ionicons name="checkmark" size={13} color="#1a1a1a" />
                              ) : (
                                <Text style={[s.dotText, { color: 'rgba(244,240,232,0.65)' }]}>{stamp}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      ))}
                      {tierSpan > 9 && (
                        <Text style={[s.dotMore, { color: accent }]}>+{tierSpan - 9} more</Text>
                      )}
                    </View>
                  );
                })()}

                <Text style={s.flipHint}>Tap to show QR code</Text>
              </>
            ) : (
              /* Back face – real QR code */
              <View style={s.backFace}>
                <Text style={s.backTitle}>MY BARBER QR</Text>

                <View style={s.qrBlock}>
                  <Text style={s.qrSmallLabel}>Stamps / Check-in</Text>
                  <View style={s.qrWrap}>
                    <QRCode
                      value={user?.email || 'no-email'}
                      size={140}
                      backgroundColor="#ffffff"
                      color="#1a1a1a"
                      ecl="H"
                      logo={require('../../../assets/icon.png')}
                      logoSize={32}
                      logoBackgroundColor="#ffffff"
                      logoMargin={3}
                      logoBorderRadius={6}
                    />
                  </View>
                  <Text style={s.qrHint}>Show this to your barber to collect stamps</Text>
                </View>

                <Text style={s.flipHint}>← Tap to flip back</Text>
              </View>
            )}

          </LinearGradient>
        </TouchableOpacity>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{stampsInCycle}</Text>
            <Text style={s.statLabel}>Stamps this cycle</Text>
          </View>
          <View style={[s.statBox, { borderLeftWidth: 1, borderLeftColor: T.border }]}>
            <Text style={s.statNum}>{stampCycle}</Text>
            <Text style={s.statLabel}>Cycles completed</Text>
          </View>
          <View style={[s.statBox, { borderLeftWidth: 1, borderLeftColor: T.border }]}>
            <Text style={[s.statNum, { color: accent }]}>{tier}</Text>
            <Text style={s.statLabel}>Current tier</Text>
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={s.howItWorks}>
          <Text style={s.howTitle}>HOW IT WORKS</Text>
          <Text style={s.howBody}>
            Every visit earns a stamp. Reach milestones to unlock rewards. Climb through Bronze, Silver, Gold, and Platinum tiers to unlock shop discounts and exclusive perks.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe:      { flex: 1, backgroundColor: T.bg },
  scroll:    { padding: 20 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  eyebrow:   { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, color: T.gold, marginBottom: 14 },
  title:     { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 2, color: T.text, textAlign: 'center', marginBottom: 10 },
  sub:       { fontFamily: T.fontBody, fontSize: 14, color: T.textDim, textAlign: 'center', lineHeight: 22 },
  rule:      { width: 36, height: 2, backgroundColor: T.red, marginVertical: 14, alignSelf: 'center' },
  signInBtn: { backgroundColor: T.red, paddingVertical: 14, paddingHorizontal: 40, marginTop: 24 },
  signInBtnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
  signUpLink:    { marginTop: 16 },
  signUpLinkText:{ fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },

  // Card
  card:      { borderRadius: 18, padding: 20, paddingBottom: 16, marginBottom: 16, overflow: 'hidden' },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tierBadgeText: { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 1, color: '#1a1a1a' },
  cycleTag:  { fontFamily: T.fontBodyBd, fontSize: 12, flex: 1 },
  stampCount:{ fontFamily: T.fontHead, fontSize: 18, letterSpacing: 1, marginLeft: 'auto' },

  progressSection:{ marginBottom: 10 },
  progressMeta:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:  { fontFamily: T.fontBodyBd, fontSize: 11, color: 'rgba(244,240,232,0.85)' },
  track:     { height: 9, backgroundColor: 'rgba(244,240,232,0.18)', borderRadius: 99, overflow: 'hidden', position: 'relative' },
  fill:      { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 99 },
  milestone: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(244,240,232,0.4)' },

  rewardHint:{ fontFamily: T.fontBodyBd, fontSize: 13, textAlign: 'center', marginVertical: 10 },
  expiryWarn:{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 6, padding: 8, marginBottom: 10 },
  expiryWarnText: { fontFamily: T.fontBodyBd, fontSize: 12, color: '#1a1a1a', textAlign: 'center' },

  pendingBox: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 10, padding: 12, marginBottom: 12 },
  pendingTitle:{ fontFamily: T.fontBodyBd, fontSize: 13, color: 'rgba(244,240,232,0.95)', marginBottom: 6 },
  pendingItem: { fontFamily: T.fontBodyMd, fontSize: 13, color: 'rgba(244,240,232,0.9)' },

  stampsGrid: { marginTop: 12, gap: 6 },
  stampRow:   { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:       { width: 36, height: 36, borderRadius: 18, borderWidth: 2, backgroundColor: 'rgba(244,240,232,0.1)', alignItems: 'center', justifyContent: 'center' },
  dotText:   { fontFamily: T.fontBodyBd, fontSize: 11 },
  dotMore:   { fontFamily: T.fontBodyBd, fontSize: 12, alignSelf: 'center', marginLeft: 4 },

  flipHint:  { fontFamily: T.fontBodyBd, fontSize: 11, color: 'rgba(244,240,232,0.7)', textAlign: 'center', marginTop: 14 },

  // Back face
  backFace:     { alignItems: 'center', paddingVertical: 20, minHeight: 320 },
  backTitle:    { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 2, color: 'rgba(244,240,232,0.9)', marginBottom: 20 },
  qrBlock:      { alignItems: 'center', marginBottom: 16 },
  qrSmallLabel: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(244,240,232,0.75)', marginBottom: 12 },
  qrWrap:       { backgroundColor: '#ffffff', padding: 10, borderRadius: 8 },
  qrHint:       { fontFamily: T.fontBody, fontSize: 11, color: 'rgba(244,240,232,0.6)', marginTop: 10, textAlign: 'center' },

  // Stats
  statsRow:  { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
  statBox:   { flex: 1, alignItems: 'center', padding: 14 },
  statNum:   { fontFamily: T.fontHead, fontSize: 26, color: T.text, letterSpacing: 1 },
  statLabel: { fontFamily: T.fontBody, fontSize: 10, color: T.textDim, letterSpacing: 1, textAlign: 'center', marginTop: 2 },

  // QR modal
  qrModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrModalCard: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 32, alignItems: 'center', width: '100%', maxWidth: 360 },
  qrModalEye: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.gold, marginBottom: 6 },
  qrModalName: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 2, color: '#f4f0e8', marginBottom: 24 },
  qrModalWrap: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 20 },
  qrModalHint: { fontFamily: T.fontBodyMd, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  qrModalClose: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 13, paddingHorizontal: 32 },
  qrModalCloseText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },

  // How it works
  howItWorks:{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.goldDim, borderLeftWidth: 3, borderLeftColor: T.gold, padding: 18 },
  howTitle:  { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 3, color: T.gold, marginBottom: 8 },
  howBody:   { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, lineHeight: 20 },
}); }
