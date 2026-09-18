import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Share, Modal, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import MysteryBoxModal from '../../components/MysteryBoxModal';

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'bookings',  label: 'Bookings' },
  { id: 'rewards',   label: 'Rewards' },
  { id: 'wallet',    label: 'Wallet' },
  { id: 'settings',  label: 'Settings' },
];

const STATUS_COLORS = {
  PENDING:   '#b45309',
  CONFIRMED: '#2e7d32',
  COMPLETED: '#4f46e5',
  CANCELLED: '#C41E3A',
  NO_SHOW:   '#6b7280',
};

const makeLegalHtml = (html, isDark) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, sans-serif; font-size: 15px; line-height: 1.65;
         padding: 16px 16px 60px; background: ${isDark ? '#111' : '#fff'}; color: ${isDark ? '#e8e3da' : '#1a1a1a'}; }
  h3 { font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
       color: ${isDark ? '#C4922A' : '#a0791c'}; margin: 24px 0 8px; }
  p { margin-bottom: 10px; }
  ul, ol { padding-left: 28px; margin-bottom: 10px; }
  li { margin-bottom: 8px; }
  li p { margin-bottom: 0; }
  strong { font-weight: 600; }
</style></head><body>${html || '<p>No content available yet.</p>'}</body></html>`;

export default function ProfileScreen({ navigation }) {
  const { user, logout, isShopUser } = useAuth();
  const { T, isDark } = useTheme();
  const { top: topInset } = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(T), [T]);
  const scrollRef = useRef(null);
  const [activeTab,       setActiveTab]       = useState('overview');
  const [bookingsActive,  setBookingsActive]  = useState(true);

  useEffect(() => {
    api.get('/booking-settings')
      .then(r => setBookingsActive(r.data.isActive !== false))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Overview
  const [profile,       setProfile]       = useState(null);
  const [tierBenefits,  setTierBenefits]  = useState(null);
  const [newsletterSaving, setNewsletterSaving] = useState(false);

  // Bookings
  const [myBookings,    setMyBookings]    = useState([]);
  const [bookingsLoaded,setBookingsLoaded]= useState(false);

  // Rewards
  const [rewards,              setRewards]              = useState([]);
  const [rewardsLoaded,        setRewardsLoaded]        = useState(false);
  const [claimError,           setClaimError]           = useState('');
  const [resendingVerification,setResendingVerification]= useState(false);
  const [resendMsg,            setResendMsg]            = useState('');
  const [showMysteryModal,     setShowMysteryModal]     = useState(false);
  const [mysteryReward,        setMysteryReward]        = useState(null);

  // Wallet
  const [wallet,        setWallet]        = useState({ balance: 0, transactions: [] });
  const [walletLoaded,  setWalletLoaded]  = useState(false);
  const [gcCode,        setGcCode]        = useState('');
  const [gcLoading,     setGcLoading]     = useState(false);
  const [gcMsg,         setGcMsg]         = useState('');
  const [gcSuccess,     setGcSuccess]     = useState(false);

  // Referrals
  const [referralSettings, setReferralSettings] = useState(null);
  const [referralData,     setReferralData]      = useState(null);
  const [generatingCode,   setGeneratingCode]    = useState(false);

  // Settings – change password
  const [oldPw,    setOldPw]    = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [pwLoading,setPwLoading]= useState(false);
  const [pwMsg,    setPwMsg]    = useState('');

  // Legal docs modal
  const [legalDoc, setLegalDoc] = useState({ visible: false, title: '', content: '', loading: false });

  const openLegal = useCallback(async (title, endpoint, dataKey) => {
    setLegalDoc({ visible: true, title, content: '', loading: true });
    try {
      const r = await api.get(endpoint);
      const html = r.data[dataKey]?.content || r.data.content || '';
      setLegalDoc(prev => ({ ...prev, content: html, loading: false }));
    } catch {
      setLegalDoc(prev => ({ ...prev, content: '<p>Could not load document. Please try again later.</p>', loading: false }));
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    api.get('/auth/profile')
      .then(r => setProfile(r.data.user))
      .catch(() => {});

    api.get('/loyalty-settings/settings')
      .then(r => setTierBenefits(r.data.settings))
      .catch(() => {});

    if (!isShopUser) {
      api.get('/referrals/settings')
        .then(r => setReferralSettings(r.data.settings))
        .catch(() => {});
      api.get('/referrals/my-referrals')
        .then(r => setReferralData(r.data))
        .catch(() => {});
    }
  }, [isShopUser]);

  // Lazy-load per tab
  useEffect(() => {
    if (activeTab === 'bookings' && !bookingsLoaded) {
      api.get('/bookings/mine')
        .then(r => setMyBookings(r.data || []))
        .catch(() => {})
        .finally(() => setBookingsLoaded(true));
    }
    if (activeTab === 'rewards' && !rewardsLoaded && !isShopUser) {
      api.get('/rewards/user-rewards')
        .then(r => setRewards(r.data.rewards || []))
        .catch(() => {})
        .finally(() => setRewardsLoaded(true));
    }
    if (activeTab === 'wallet' && !walletLoaded && !isShopUser) {
      api.get('/wallet/me')
        .then(r => setWallet({ balance: r.data.balance, transactions: r.data.transactions || [] }))
        .catch(() => {})
        .finally(() => setWalletLoaded(true));
    }
  }, [activeTab, bookingsLoaded, rewardsLoaded, walletLoaded, isShopUser]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleClaimReward = async (rewardId) => {
    setClaimError('');
    try {
      const r = await api.post(`/rewards/${rewardId}/claim`);
      Alert.alert('Reward Claimed!', 'Show the QR code on your screen to your barber to redeem.');
      // Refresh rewards
      const updated = await api.get('/rewards/user-rewards');
      setRewards(updated.data.rewards || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not claim reward.';
      setClaimError(msg);
      setTimeout(() => setClaimError(''), 4000);
    }
  };

  const resendVerificationEmail = async () => {
    setResendingVerification(true);
    setResendMsg('');
    try {
      const r = await api.post('/auth/resend-verification');
      setResendMsg(r.data.message || 'Verification email sent — check your inbox.');
      setTimeout(() => setResendMsg(''), 5000);
    } catch (err) {
      setResendMsg(err.response?.data?.message || 'Could not send verification email.');
      setTimeout(() => setResendMsg(''), 4000);
    } finally {
      setResendingVerification(false);
    }
  };

  const handleRedeemGiftCard = async () => {
    if (!gcCode.trim()) return;
    setGcLoading(true); setGcMsg(''); setGcSuccess(false);
    try {
      const r = await api.post('/wallet/redeem-gift-card', { code: gcCode.trim() });
      setGcSuccess(true);
      setGcMsg(`£${r.data.amountAdded.toFixed(2)} added to your wallet.`);
      setGcCode('');
      const walletRes = await api.get('/wallet/me');
      setWallet({ balance: walletRes.data.balance, transactions: walletRes.data.transactions || [] });
    } catch (err) {
      setGcMsg(err.response?.data?.message || 'Invalid or expired gift card code.');
    } finally {
      setGcLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) { setPwMsg('Please fill in both fields.'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      await api.put('/auth/password', { currentPassword: oldPw, newPassword: newPw });
      setPwMsg('Password updated successfully.');
      setOldPw(''); setNewPw('');
    } catch (err) {
      setPwMsg(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const toggleNewsletter = async () => {
    const next = !profile.newsletterOptIn;
    setNewsletterSaving(true);
    try {
      await api.put('/auth/profile', { newsletterOptIn: next });
      setProfile(p => ({ ...p, newsletterOptIn: next }));
    } catch {
      Alert.alert('Error', 'Could not update newsletter preference.');
    } finally {
      setNewsletterSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/auth/delete');
              logout();
            } catch {
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleGenerateReferralCode = async () => {
    setGeneratingCode(true);
    try {
      const r = await api.post('/referrals/generate-code');
      setReferralData(prev => ({ ...prev, referralCode: r.data.referralCode }));
    } catch {
      Alert.alert('Error', 'Could not generate referral code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleShareReferralCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await Share.share({ message: `Use my referral code ${referralData.referralCode} when signing up to LEV3L BARBERS!` });
    } catch { /* ignore */ }
  };

  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={[]}>
        <View style={[s.header, { paddingBottom: 20 }]}>
          <Text style={s.headerName}>PROFILE</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontFamily: T.fontHead, fontSize: 28, letterSpacing: 2, color: T.text, textAlign: 'center', marginBottom: 10 }}>
            YOUR PROFILE
          </Text>
          <View style={{ width: 36, height: 2, backgroundColor: T.red, marginVertical: 14 }} />
          <Text style={{ fontFamily: T.fontBody, fontSize: 14, color: T.textDim, textAlign: 'center', lineHeight: 22 }}>
            Sign in to view your bookings, rewards, wallet, and account settings.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: T.red, paddingVertical: 14, paddingHorizontal: 40, marginTop: 24 }}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' }}>SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate('Signup')}>
            <Text style={{ fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim }}>No account? Sign up free</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const visibleTabs = isShopUser
    ? TABS.filter(t => ['overview', 'bookings', 'settings'].includes(t.id) && (t.id !== 'bookings' || bookingsActive))
    : TABS.filter(t => t.id !== 'bookings' || bookingsActive);

  const displayName = profile?.name || user?.name || 'You';

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>MY ACCOUNT</Text>
        <Text style={s.headerName}>{displayName}</Text>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {visibleTabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[s.tabItem, activeTab === t.id && s.tabActive]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, activeTab === t.id && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView ref={scrollRef} style={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <View style={s.tabContent}>
            <View style={s.card}>
              <Field label="Name"  value={profile?.name  || user?.name} />
              <Field label="Email" value={profile?.email || user?.email} />
              {!isShopUser && profile?.tier && (() => {
                const tierColors = { BRONZE: '#b5722d', SILVER: '#8a8f99', GOLD: T.gold, PLATINUM: '#6b7280' };
                const tc = tierColors[profile.tier] || T.red;
                const discountPct = tierBenefits
                  ? ({ SILVER: tierBenefits.silverDiscount, GOLD: tierBenefits.goldDiscount, PLATINUM: tierBenefits.platinumDiscount }[profile.tier] || 0)
                  : 0;
                return (
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>MEMBER TIER</Text>
                    <View style={s.tierRow}>
                      <View style={[s.tierBadge, { backgroundColor: tc + '18', borderColor: tc + '44' }]}>
                        <Text style={[s.tierBadgeText, { color: tc }]}>{profile.tier}</Text>
                      </View>
                      {discountPct > 0 && (
                        <Text style={s.tierPerk}>{discountPct}% off shop purchases</Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {isShopUser && (
                <TouchableOpacity
                  style={s.adminBtn}
                  onPress={() => navigation.navigate('Admin')}
                  activeOpacity={0.8}
                >
                  <Text style={s.adminBtnText}>ADMIN PANEL</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={s.logoutBtnText}>LOG OUT</Text>
              </TouchableOpacity>
            </View>

            {!isShopUser && referralSettings?.isActive && (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Refer a Friend</Text>
                {referralData?.referralCode ? (
                  <View>
                    <View style={s.referralCodeRow}>
                      <Text style={s.referralCode}>{referralData.referralCode}</Text>
                      <TouchableOpacity style={s.shareBtn} onPress={handleShareReferralCode} activeOpacity={0.8}>
                        <Text style={s.shareBtnText}>SHARE</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.referralHint}>
                      Share your code. When friends sign up and verify their email, you unlock rewards.
                    </Text>
                    {referralData?.cyclePosition !== undefined && (
                      <View style={s.progressWrap}>
                        <Text style={s.progressText}>
                          Progress this cycle: {referralData.cyclePosition} / 5
                        </Text>
                        <View style={s.progressTrack}>
                          <View style={[s.progressFill, { width: `${(referralData.cyclePosition / 5) * 100}%` }]} />
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.outlineBtn}
                    onPress={handleGenerateReferralCode}
                    disabled={generatingCode}
                    activeOpacity={0.8}
                  >
                    <Text style={s.outlineBtnText}>{generatingCode ? 'GENERATING…' : 'GET MY REFERRAL CODE'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Bookings ── */}
        {activeTab === 'bookings' && (
          <View style={s.tabContent}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>My Bookings</Text>
              {!bookingsLoaded ? (
                <ActivityIndicator color={T.red} style={{ marginTop: 16 }} />
              ) : myBookings.length === 0 ? (
                <Text style={s.emptyText}>No bookings yet.</Text>
              ) : (
                myBookings.map(b => {
                  const dt = new Date(b.appointmentAt);
                  const dateStr = isNaN(dt) ? b.appointmentAt : dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                  const timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const sc = STATUS_COLORS[b.status] || '#6b7280';
                  return (
                    <View key={b.id} style={s.bookingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.bookingService}>{b.serviceName}</Text>
                        <Text style={s.bookingMeta}>{dateStr}{timeStr ? ` at ${timeStr}` : ''}{b.barber?.displayName ? ` · ${b.barber.displayName}` : ''}</Text>
                        {b.depositAmount > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {b.depositPaid && <Ionicons name="checkmark-circle" size={12} color="#2e7d32" />}
                            <Text style={[s.bookingMeta, { color: b.depositPaid ? '#2e7d32' : '#b45309' }]}>
                              Deposit: £{b.depositAmount.toFixed(2)} {b.depositPaid ? 'Paid' : '(pending)'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: sc + '18', borderColor: sc + '44' }]}>
                        <Text style={[s.statusText, { color: sc }]}>{b.status}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ── Rewards ── */}
        {activeTab === 'rewards' && !isShopUser && (
          <View style={s.tabContent}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>My Rewards</Text>
              {!!claimError && <Text style={s.errorText}>{claimError}</Text>}
              {!!resendMsg && (
                <Text style={[s.errorText, { color: resendMsg.startsWith('Could') ? T.red : '#2e7d32' }]}>
                  {resendMsg}
                </Text>
              )}
              {!rewardsLoaded ? (
                <ActivityIndicator color={T.red} style={{ marginTop: 16 }} />
              ) : rewards.length === 0 ? (
                <Text style={s.emptyText}>No rewards yet. Keep getting haircuts!</Text>
              ) : (
                rewards.map(r => {
                  const isMystery = r.rewardType?.toLowerCase().includes('mystery');
                  return (
                    <View key={r.id} style={s.rewardCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rewardType}>{r.rewardValue || r.rewardType}</Text>
                        {(() => {
                          const color = r.status === 'UNCLAIMED' ? T.red : r.status === 'CLAIMED' ? '#2e7d32' : T.textDim;
                          const icon = r.status === 'UNCLAIMED' ? 'gift-outline' : r.status === 'LOCKED' ? 'lock-closed' : r.status === 'CLAIMED' ? 'checkmark-circle' : 'time-outline';
                          const label = r.status === 'UNCLAIMED' ? 'Bring to your next visit' : r.status === 'LOCKED' ? 'Verify email to unlock' : r.status === 'CLAIMED' ? 'Collected' : 'Expired';
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                              <Ionicons name={icon} size={12} color={color} />
                              <Text style={[s.rewardStatus, { color }]}>{label}</Text>
                            </View>
                          );
                        })()}
                        {r.status === 'LOCKED' && (
                          <TouchableOpacity
                            onPress={resendVerificationEmail}
                            disabled={resendingVerification}
                            style={{ marginTop: 4 }}
                          >
                            <Text style={s.resendLink}>
                              {resendingVerification ? 'sending…' : 'resend email'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {r.expiresAt && r.status === 'UNCLAIMED' && (() => {
                          const days = Math.ceil((new Date(r.expiresAt) - Date.now()) / 86400000);
                          return days > 0 && days <= 14
                            ? <Text style={s.expiryWarn}>Expires in {days} day{days !== 1 ? 's' : ''}</Text>
                            : null;
                        })()}
                      </View>
                      {r.status === 'UNCLAIMED' && isMystery && (
                        <TouchableOpacity
                          style={[s.claimBtn, { backgroundColor: T.gold }]}
                          onPress={() => { setMysteryReward(r); setShowMysteryModal(true); }}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.claimBtnText, { color: '#1a1a1a' }]}>REVEAL</Text>
                        </TouchableOpacity>
                      )}
                      {r.status === 'UNCLAIMED' && !isMystery && (
                        <TouchableOpacity
                          style={s.claimBtn}
                          onPress={() => handleClaimReward(r.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.claimBtnText}>CLAIM</Text>
                        </TouchableOpacity>
                      )}
                      {r.status === 'LOCKED' && (
                        <View style={s.claimBtnDisabled}>
                          <Text style={s.claimBtnDisabledText}>LOCKED</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <MysteryBoxModal
          visible={showMysteryModal}
          reward={mysteryReward}
          onClose={() => { setShowMysteryModal(false); setMysteryReward(null); }}
          onClaimed={async () => {
            const updated = await api.get('/rewards/user-rewards').catch(() => null);
            if (updated) setRewards(updated.data.rewards || []);
          }}
        />

        {/* ── Wallet ── */}
        {activeTab === 'wallet' && !isShopUser && (
          <View style={s.tabContent}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>My Wallet</Text>
              {!walletLoaded ? (
                <ActivityIndicator color={T.red} style={{ marginTop: 16 }} />
              ) : (
                <>
                  <View style={s.walletBalance}>
                    <Text style={s.walletLabel}>CREDIT BALANCE</Text>
                    <Text style={s.walletAmt}>£{Number(wallet.balance).toFixed(2)}</Text>
                  </View>

                  {/* Gift card redeem */}
                  <View style={s.gcSection}>
                    <Text style={s.gcLabel}>LOAD GIFT CARD</Text>
                    <View style={s.gcRow}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={gcCode}
                        onChangeText={t => setGcCode(t.toUpperCase())}
                        placeholder="LEV3L-XXXX-XXXX-XXXX"
                        placeholderTextColor={T.textDim}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={[s.gcBtn, (!gcCode.trim() || gcLoading) && { opacity: 0.4 }]}
                        onPress={handleRedeemGiftCard}
                        disabled={!gcCode.trim() || gcLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={s.gcBtnText}>{gcLoading ? '…' : 'LOAD'}</Text>
                      </TouchableOpacity>
                    </View>
                    {!!gcMsg && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        {gcSuccess && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" />}
                        <Text style={[s.gcMsg, { color: gcSuccess ? '#2e7d32' : T.red, marginTop: 0 }]}>{gcMsg}</Text>
                      </View>
                    )}
                  </View>

                  {/* Transactions */}
                  {wallet.transactions.length > 0 && (
                    <View style={s.txnSection}>
                      <Text style={s.txnSectionLabel}>RECENT ACTIVITY</Text>
                      {wallet.transactions.slice(0, 10).map(t => (
                        <View key={t.id} style={s.txnRow}>
                          <Text style={s.txnDesc} numberOfLines={1}>{t.description || t.type}</Text>
                          <Text style={[s.txnAmt, { color: t.amount > 0 ? '#2e7d32' : T.red }]}>
                            {t.amount > 0 ? '+' : ''}£{Math.abs(t.amount).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Settings ── */}
        {activeTab === 'settings' && (
          <View style={s.tabContent}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>Settings</Text>

              {/* Change password */}
              <Text style={s.settingHeading}>Change Password</Text>
              <Text style={s.label}>CURRENT PASSWORD</Text>
              <TextInput
                style={s.input}
                value={oldPw}
                onChangeText={setOldPw}
                placeholder="Current password"
                placeholderTextColor={T.textDim}
                secureTextEntry
                autoCapitalize="none"
              />
              <Text style={s.label}>NEW PASSWORD</Text>
              <TextInput
                style={s.input}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="New password (8+ chars, upper, lower, number, symbol)"
                placeholderTextColor={T.textDim}
                secureTextEntry
                autoCapitalize="none"
              />
              {!!pwMsg && (
                <Text style={[s.pwMsg, { color: pwMsg.includes('success') ? '#2e7d32' : T.red }]}>{pwMsg}</Text>
              )}
              <TouchableOpacity
                style={[s.outlineBtn, { marginBottom: 0 }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
                activeOpacity={0.8}
              >
                <Text style={s.outlineBtnText}>{pwLoading ? 'SAVING…' : 'CHANGE PASSWORD'}</Text>
              </TouchableOpacity>

              <View style={s.divider} />

              {/* Newsletter */}
              <View style={s.newsletterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingHeading}>Email Newsletter</Text>
                  <Text style={s.newsletterHint}>Occasional news, offers, and updates from LEV3L Barbers.</Text>
                </View>
                <Switch
                  value={!!profile.newsletterOptIn}
                  onValueChange={toggleNewsletter}
                  disabled={newsletterSaving}
                  trackColor={{ true: T.red, false: T.border }}
                  thumbColor="#fff"
                />
              </View>

              <View style={s.divider} />

              {/* Danger zone */}
              <TouchableOpacity style={s.dangerBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
                <Text style={s.dangerBtnText}>DELETE ACCOUNT</Text>
              </TouchableOpacity>
            </View>

            {/* Legal */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Legal</Text>
              <TouchableOpacity
                style={s.legalRow}
                onPress={() => openLegal('Terms & Conditions', '/general-terms', 'terms')}
                activeOpacity={0.7}
              >
                <Text style={s.legalRowText}>Terms &amp; Conditions</Text>
                <Ionicons name="chevron-forward" size={16} color={T.textDim} />
              </TouchableOpacity>
              <View style={s.divider} />
              <TouchableOpacity
                style={s.legalRow}
                onPress={() => openLegal('Privacy Notice', '/privacy-notice', 'notice')}
                activeOpacity={0.7}
              >
                <Text style={s.legalRowText}>Privacy Notice</Text>
                <Ionicons name="chevron-forward" size={16} color={T.textDim} />
              </TouchableOpacity>
              <View style={s.divider} />
              <TouchableOpacity
                style={s.legalRow}
                onPress={() => openLegal('Reward Programme Terms', '/reward-terms', 'terms')}
                activeOpacity={0.7}
              >
                <Text style={s.legalRowText}>Reward Programme Terms</Text>
                <Ionicons name="chevron-forward" size={16} color={T.textDim} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Legal doc modal */}
      <Modal
        visible={legalDoc.visible}
        animationType="slide"
        onRequestClose={() => setLegalDoc(prev => ({ ...prev, visible: false }))}
      >
        <View style={[s.legalModal, { paddingBottom: 0 }]}>
          <View style={[s.legalModalHead, { paddingTop: topInset + 16 }]}>
            <Text style={s.legalModalTitle}>{legalDoc.title.toUpperCase()}</Text>
            <TouchableOpacity
              onPress={() => setLegalDoc(prev => ({ ...prev, visible: false }))}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={s.legalCloseBtn}
            >
              <Ionicons name="close" size={26} color={T.text} />
            </TouchableOpacity>
          </View>
          <View style={s.legalModalRule} />
          {legalDoc.loading ? (
            <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
          ) : (
            <WebView
              style={s.legalModalWeb}
              source={{ html: makeLegalHtml(legalDoc.content, isDark) }}
              originWhitelist={['*']}
              scrollEnabled
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe:      { flex: 1, backgroundColor: T.bg },
  header:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  eyebrow:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 2 },
  headerName:{ fontFamily: T.fontHead, fontSize: 28, letterSpacing: 2, color: T.text },

  tabBar:    { borderBottomWidth: 1, borderBottomColor: T.textFaint, backgroundColor: T.surface },
  tabItem:   { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: T.red },
  tabLabel:  { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: T.textDim },
  tabLabelActive: { color: T.text },

  scroll:    { flex: 1 },
  tabContent:{ padding: 16 },

  card:      { backgroundColor: T.surface, borderWidth: 1, borderColor: T.textFaint, padding: 18, marginBottom: 14 },
  sectionTitle: { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 2, color: T.text, textAlign: 'center', marginBottom: 16 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel:{ fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.red, marginBottom: 4, textTransform: 'uppercase' },
  fieldValue:{ fontFamily: T.fontBody, fontSize: 15, color: T.text },

  tierRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  tierBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  tierBadgeText: { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2 },
  tierPerk:   { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, flex: 1 },

  adminBtn:   { backgroundColor: T.gold, paddingVertical: 13, alignItems: 'center', marginTop: 6, marginBottom: 8 },
  adminBtnText:{ fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#1a1a1a' },
  logoutBtn:  { backgroundColor: T.red, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  logoutBtnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },

  referralCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  referralCode:    { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 5, color: T.red, flex: 1 },
  shareBtn:        { borderWidth: 1, borderColor: T.red, paddingHorizontal: 12, paddingVertical: 7 },
  shareBtnText:    { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: T.red },
  referralHint:    { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 12 },
  progressWrap:    { marginTop: 4 },
  progressText:    { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textDim, marginBottom: 6 },
  progressTrack:   { height: 6, backgroundColor: T.border, borderRadius: 99, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: T.red, borderRadius: 99 },

  emptyText: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, textAlign: 'center', marginTop: 8 },
  errorText: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.red, textAlign: 'center', marginBottom: 10 },

  bookingRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border, gap: 10 },
  bookingService:{ fontFamily: T.fontHead, fontSize: 16, letterSpacing: 1, color: T.text, marginBottom: 3 },
  bookingMeta:   { fontFamily: T.fontBody, fontSize: 12, color: T.textDim },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText:    { fontFamily: T.fontHead, fontSize: 10, letterSpacing: 1 },

  rewardCard:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 8 },
  rewardType:    { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 1, color: T.text, marginBottom: 2 },
  rewardStatus:  { fontFamily: T.fontBodyMd, fontSize: 12 },
  expiryWarn:    { fontFamily: T.fontBodyMd, fontSize: 11, color: '#b45309', marginTop: 3 },
  resendLink:    { fontFamily: T.fontBodyMd, fontSize: 11, color: T.red, textDecorationLine: 'underline' },
  claimBtn:      { borderWidth: 1, borderColor: T.red, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 10 },
  claimBtnText:  { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: T.red },
  claimBtnDisabled: { borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 10 },
  claimBtnDisabledText: { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: T.textFaint },

  walletBalance: { alignItems: 'center', marginBottom: 20 },
  walletLabel:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, marginBottom: 4 },
  walletAmt:     { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 2, color: T.text },
  gcSection:     { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 16 },
  gcLabel:       { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, marginBottom: 8 },
  gcRow:         { flexDirection: 'row', gap: 8 },
  input:         { backgroundColor: T.card, borderWidth: 1, borderColor: T.textFaint, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 },
  gcBtn:         { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.red, paddingHorizontal: 14, justifyContent: 'center' },
  gcBtnText:     { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: T.red },
  gcMsg:         { fontFamily: T.fontBodyMd, fontSize: 12, marginTop: 8 },
  txnSection:    { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14, marginTop: 10 },
  txnSectionLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, marginBottom: 8 },
  txnRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  txnDesc:       { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, flex: 1, marginRight: 10 },
  txnAmt:        { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 1 },

  settingHeading:{ fontFamily: T.fontHead, fontSize: 16, letterSpacing: 2, color: T.text, marginBottom: 12 },
  label:         { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.text, marginBottom: 5, marginTop: 12, textTransform: 'uppercase' },
  pwMsg:         { fontFamily: T.fontBodyMd, fontSize: 12, marginTop: 8 },
  outlineBtn:    { borderWidth: 1.5, borderColor: T.textFaint, paddingVertical: 13, alignItems: 'center', marginTop: 14, marginBottom: 4 },
  outlineBtnText:{ fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: T.text },
  divider:       { height: 1, backgroundColor: T.border, marginVertical: 20 },
  newsletterRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newsletterHint:{ fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 17, marginTop: 2 },
  dangerBtn:     { borderWidth: 1, borderColor: T.red, paddingVertical: 13, alignItems: 'center' },
  dangerBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: T.red },

  legalRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  legalRowText: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },

  legalModal:      { flex: 1, backgroundColor: T.bg },
  legalModalHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  legalModalTitle: { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 3, color: T.text },
  legalModalRule:  { height: 1, backgroundColor: T.border, marginHorizontal: 20 },
  legalModalWeb:   { flex: 1, backgroundColor: 'transparent' },
  legalCloseBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}); }
