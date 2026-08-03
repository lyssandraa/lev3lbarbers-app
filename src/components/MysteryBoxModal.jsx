import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Animated, Image, Dimensions, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';
import Confetti from './Confetti';

const { width: W } = Dimensions.get('window');

// Phases: idle → revealing → revealed → claiming → claimed
export default function MysteryBoxModal({ visible, reward, onClose, onClaimed }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [phase,        setPhase]        = useState('idle');
  const [revealedVal,  setRevealedVal]  = useState('');
  const [qrCode,       setQrCode]       = useState('');
  const [err,          setErr]          = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [resending,    setResending]    = useState(false);
  const [resendMsg,    setResendMsg]    = useState('');

  const boxScale   = useRef(new Animated.Value(1)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setRevealedVal('');
      setQrCode('');
      setErr('');
      setShowConfetti(false);
      setResendMsg('');
      setResending(false);
      boxScale.setValue(1);
      revealAnim.setValue(0);
    }
  }, [visible]);

  const handleReveal = async () => {
    if (phase !== 'idle') return;
    // Wobble then shrink box away
    Animated.sequence([
      Animated.timing(boxScale, { toValue: 1.18, duration: 90,  useNativeDriver: true }),
      Animated.timing(boxScale, { toValue: 0.88, duration: 90,  useNativeDriver: true }),
      Animated.timing(boxScale, { toValue: 1.1,  duration: 70,  useNativeDriver: true }),
      Animated.timing(boxScale, { toValue: 0,    duration: 160, useNativeDriver: true }),
    ]).start();

    setPhase('revealing');
    try {
      const r = await api.post('/rewards/reveal-reward', {
        rewardType: reward?.rewardType || 'Mystery box',
      });
      setRevealedVal(r.data.rewardValue || 'Mystery Reward');
      setPhase('revealed');
      Animated.spring(revealAnim, {
        toValue: 1, tension: 55, friction: 7, useNativeDriver: true,
      }).start();
      setTimeout(() => setShowConfetti(true), 300);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not reveal reward. Try again.');
      setPhase('idle');
      Animated.spring(boxScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const handleClaim = async () => {
    if (!reward?.id) return;
    setPhase('claiming');
    setErr('');
    try {
      const r = await api.post(`/rewards/${reward.id}/claim`);
      setQrCode(r.data.qrCode);
      setPhase('claimed');
      onClaimed?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not claim reward.');
      setPhase('revealed');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const r = await api.post('/auth/resend-verification');
      setResendMsg(r.data.message || 'Check your inbox for the verification email.');
    } catch (e) {
      setResendMsg(e.response?.data?.message || 'Could not send email. Try again.');
    } finally {
      setResending(false);
    }
  };

  const isLocked = reward?.status === 'LOCKED';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {showConfetti && (
          <Confetti count={80} onDone={() => setShowConfetti(false)} />
        )}

        <Pressable style={s.backdrop} onPress={phase === 'idle' ? onClose : undefined}>
          <Pressable style={s.card} onPress={() => {}}>

            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>MYSTERY BOX</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={T.textDim} />
              </TouchableOpacity>
            </View>

            {/* ── IDLE / REVEALING ── */}
            {(phase === 'idle' || phase === 'revealing') && (
              <TouchableOpacity
                style={s.boxArea}
                onPress={handleReveal}
                activeOpacity={0.82}
                disabled={phase === 'revealing'}
              >
                <Animated.View style={[s.boxEmoji, { transform: [{ scale: boxScale }] }]}>
                  <Ionicons name="gift" size={88} color={T.gold} />
                </Animated.View>
                {phase === 'revealing'
                  ? <ActivityIndicator color={T.red} style={{ marginTop: 20 }} />
                  : <Text style={s.tapHint}>TAP TO REVEAL</Text>
                }
                {err ? <Text style={s.errTxt}>{err}</Text> : null}
              </TouchableOpacity>
            )}

            {/* ── REVEALED ── */}
            {phase === 'revealed' && (
              <View style={s.revealArea}>
                <Ionicons name="sparkles" size={32} color={T.gold} style={{ marginBottom: 8 }} />
                <Animated.Text style={[s.rewardVal, {
                  opacity: revealAnim,
                  transform: [{
                    scale: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                  }],
                }]}>
                  {revealedVal}
                </Animated.Text>

                {isLocked ? (
                  <View style={s.lockedBlock}>
                    <View style={s.lockedRow}>
                      <Ionicons name="lock-closed" size={14} color={T.textDim} style={{ marginRight: 6 }} />
                      <Text style={s.lockedTxt}>Verify your email to unlock</Text>
                    </View>
                    {resendMsg ? (
                      <Text style={s.resendMsg}>{resendMsg}</Text>
                    ) : (
                      <TouchableOpacity onPress={handleResend} disabled={resending}>
                        <Text style={s.resendLink}>
                          {resending ? 'sending…' : 'Resend verification email'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <Ionicons name="gift-outline" size={14} color={T.red} />
                      <Text style={s.unclaimedHint}>Bring this to your next visit</Text>
                    </View>
                    <TouchableOpacity style={s.claimBtn} onPress={handleClaim} activeOpacity={0.85}>
                      <Text style={s.claimBtnTxt}>CLAIM REWARD</Text>
                    </TouchableOpacity>
                  </>
                )}

                {err ? <Text style={s.errTxt}>{err}</Text> : null}
              </View>
            )}

            {/* ── CLAIMING ── */}
            {phase === 'claiming' && (
              <View style={s.boxArea}>
                <ActivityIndicator color={T.red} size="large" />
                <Text style={s.tapHint}>Generating QR...</Text>
              </View>
            )}

            {/* ── CLAIMED ── */}
            {phase === 'claimed' && qrCode && (
              <View style={s.qrArea}>
                <Text style={s.claimedTitle}>REWARD CLAIMED</Text>
                <Text style={s.qrHint}>Show this QR code to your barber</Text>
                <Image
                  source={{ uri: qrCode }}
                  style={s.qrImage}
                  resizeMode="contain"
                />
                <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={s.doneBtnTxt}>DONE</Text>
                </TouchableOpacity>
              </View>
            )}

          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      padding: 24,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    title: {
      fontFamily: T.fontHead,
      fontSize: 18,
      letterSpacing: 4,
      color: T.text,
    },

    // Box phase
    boxArea: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 16,
    },
    boxEmoji: { alignItems: 'center', justifyContent: 'center', height: 96 },
    tapHint: {
      fontFamily: T.fontBodyMd,
      fontSize: 11,
      letterSpacing: 3,
      color: T.textDim,
      textTransform: 'uppercase',
    },

    // Reveal phase
    revealArea: { alignItems: 'center', paddingVertical: 16, gap: 12 },
    rewardVal: {
      fontFamily: T.fontHead,
      fontSize: 26,
      letterSpacing: 2,
      color: T.gold,
      textAlign: 'center',
    },
    unclaimedHint: {
      fontFamily: T.fontBody,
      fontSize: 13,
      color: T.textDim,
      textAlign: 'center',
    },
    claimBtn: {
      backgroundColor: T.red,
      paddingVertical: 14,
      paddingHorizontal: 36,
      marginTop: 4,
    },
    claimBtnTxt: {
      fontFamily: T.fontHead,
      fontSize: 14,
      letterSpacing: 3,
      color: '#fff',
    },

    // Locked
    lockedBlock: { alignItems: 'center', gap: 8, marginTop: 4 },
    lockedRow:   { flexDirection: 'row', alignItems: 'center' },
    lockedTxt: {
      fontFamily: T.fontBody,
      fontSize: 13,
      color: T.textDim,
    },
    resendLink: {
      fontFamily: T.fontBodyMd,
      fontSize: 12,
      color: T.red,
      textDecorationLine: 'underline',
    },
    resendMsg: {
      fontFamily: T.fontBody,
      fontSize: 12,
      color: '#2e7d32',
      textAlign: 'center',
    },

    // QR phase
    qrArea: { alignItems: 'center', paddingVertical: 12, gap: 12 },
    claimedTitle: {
      fontFamily: T.fontHead,
      fontSize: 18,
      letterSpacing: 3,
      color: T.text,
    },
    qrHint: {
      fontFamily: T.fontBody,
      fontSize: 13,
      color: T.textDim,
      textAlign: 'center',
    },
    qrImage: {
      width: 200,
      height: 200,
      backgroundColor: '#fff',
      padding: 8,
    },
    doneBtn: {
      backgroundColor: T.red,
      paddingVertical: 14,
      paddingHorizontal: 48,
      marginTop: 4,
    },
    doneBtnTxt: {
      fontFamily: T.fontHead,
      fontSize: 14,
      letterSpacing: 3,
      color: '#fff',
    },

    errTxt: {
      fontFamily: T.fontBody,
      fontSize: 12,
      color: T.red,
      textAlign: 'center',
      marginTop: 4,
    },
  });
}
