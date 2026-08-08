import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer } from 'expo-audio';
import api from '../../../api/api';

const SCAN_SOUND = require('../../../../assets/sounds/stamp-scanned.wav');
import { useTheme } from '../../../context/ThemeContext';

const TIER_COLORS = {
  BRONZE:   '#d4a853',
  SILVER:   '#8a93a3',
  GOLD:     '#caa400',
  PLATINUM: '#7d8aa8',
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function StampSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [email,        setEmail]        = useState('');
  const [userData,     setUserData]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [success,      setSuccess]      = useState('');
  const [error,        setError]        = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [deferred,     setDeferred]     = useState(new Set());
  const [showPopup,    setShowPopup]    = useState(false);
  const [showCamera,   setShowCamera]   = useState(false);
  const [scanned,      setScanned]      = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const scanSound = useAudioPlayer(SCAN_SOUND);

  const clear = () => { setSuccess(''); setError(''); };

  const lookupUser = useCallback(async (overrideEmail) => {
    const q = (overrideEmail ?? email).trim();
    if (!q) return;
    setLoading(true); clear(); setUserData(null);
    try {
      const res = await api.get(`/stamps/user?email=${encodeURIComponent(q)}`);
      setUserData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Customer not found');
    } finally { setLoading(false); }
  }, [email]);

  const handleQRScan = useCallback((data) => {
    // QR contains the customer's email address directly
    const scannedEmail = data.trim().toLowerCase();
    setEmail(scannedEmail);
    lookupUser(scannedEmail);
  }, [lookupUser]);

  const startScan = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }
    if (CameraView.isModernBarcodeScannerAvailable) {
      const sub = CameraView.onModernBarcodeScanned(({ data }) => {
        sub.remove();
        CameraView.dismissScanner();
        handleQRScan(data);
      });
      await CameraView.launchScanner({ barcodeTypes: ['qr'] });
    } else {
      setScanned(false);
      setShowCamera(true);
    }
  }, [permission, requestPermission, handleQRScan]);

  const onBarcodeScanned = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);
    setShowCamera(false);
    handleQRScan(data);
  }, [scanned, handleQRScan]);

  const addStamp = async () => {
    if (!userData) return;
    setAdding(true); clear();
    try {
      const res = await api.post('/stamps/add-stamp', { email: userData.email });
      let msg = 'Stamp added!';
      if (res.data.newReward?.type === 'BONUS_STAMP') msg = 'Stamp added! Bonus stamp also applied.';
      setSuccess(msg);
      try { await scanSound.seekTo(0); scanSound.play(); } catch {}
      if (res.data.claimedRewards?.length > 0) {
        setClaimedRewards(res.data.claimedRewards);
        setDeferred(new Set());
        setShowPopup(true);
      }
      const updated = await api.get(`/stamps/user?email=${encodeURIComponent(userData.email)}`);
      setUserData(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add stamp');
    } finally { setAdding(false); }
  };

  const reset = () => { setUserData(null); setEmail(''); clear(); setScanned(false); };

  const toggleDefer = useCallback((id) => {
    setDeferred(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const confirmPopup = async () => {
    for (const id of deferred) {
      try { await api.post('/stamps/defer-reward', { rewardId: id }); } catch {}
    }
    setShowPopup(false); setClaimedRewards([]); setDeferred(new Set());
  };


  const tierColor = userData ? (TIER_COLORS[userData.tier] || TIER_COLORS.BRONZE) : T.red;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.cardLabel}>STAMP MANAGER</Text>
        <Text style={s.help}>
          Ask the customer to open their Scan tab and show their QR code. Scan it directly, or type their email below.
        </Text>

        {!userData && (
          <>
            {/* Primary: scan customer's QR */}
            <TouchableOpacity style={s.scanBtn} onPress={startScan} activeOpacity={0.8}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
              <Text style={s.scanBtnText}>SCAN CUSTOMER QR</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or enter email manually</Text>
              <View style={s.dividerLine} />
            </View>

            <Text style={s.label}>CUSTOMER EMAIL</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={t => { setEmail(t); clear(); }}
                placeholder="customer@example.com"
                placeholderTextColor={T.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => lookupUser()}
              />
              {!!email && (
                <TouchableOpacity onPress={() => { setEmail(''); clear(); setUserData(null); }} style={s.inputClear}>
                  <Ionicons name="close-circle" size={18} color={T.textDim} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[s.btn, (!email.trim() || loading) && s.btnDim]}
              onPress={() => lookupUser()}
              disabled={!email.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>FIND CUSTOMER</Text>}
            </TouchableOpacity>
          </>
        )}

        {!!error && !showPopup && (
          <View style={[s.msg, { borderColor: T.red, backgroundColor: T.redDim }]}>
            <Ionicons name="alert-circle" size={14} color={T.red} />
            <Text style={[s.msgText, { color: T.red }]}>{error}</Text>
          </View>
        )}
        {!!success && !showPopup && (
          <View style={[s.msg, { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.10)' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={[s.msgText, { color: '#22c55e' }]}>{success}</Text>
          </View>
        )}

        {userData && (
          <View style={[s.customer, { borderLeftColor: tierColor }]}>
            <View style={s.custHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.custName}>{userData.name || 'Customer'}</Text>
                <Text style={s.custEmail}>{userData.email}</Text>
              </View>
              <View style={[s.tierBadge, { backgroundColor: tierColor }]}>
                <Text style={s.tierText}>{userData.tier || 'BRONZE'}</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.stat}><Text style={[s.statNum, { color: tierColor }]}>{userData.stampsInCycle ?? '—'}</Text><Text style={s.statLabel}>This cycle</Text></View>
              <View style={[s.stat, s.statMid]}><Text style={[s.statNum, { color: tierColor }]}>{userData.stampCycle ?? '—'}</Text><Text style={s.statLabel}>Cycles done</Text></View>
              <View style={s.stat}><Text style={[s.statNum, { color: tierColor }]}>{userData.stampsToNextReward ?? '—'}</Text><Text style={s.statLabel}>To next reward</Text></View>
            </View>

            {(userData.birthdayMonth || userData.birthdayDay) && (
              <View style={s.bdRow}>
                <Ionicons name="gift-outline" size={13} color={T.textDim} />
                <Text style={s.bdText}>
                  Birthday: {userData.birthdayMonth ? MONTHS[userData.birthdayMonth - 1] : '?'} {userData.birthdayDay ?? '?'}
                </Text>
              </View>
            )}

            {userData.pendingRewards?.length > 0 && (
              <View style={[s.pending, { borderColor: tierColor + '55' }]}>
                <Text style={s.pendingTitle}>Give on this visit:</Text>
                {userData.pendingRewards.map(r => (
                  <Text key={r.id} style={s.pendingItem}>
                    <Ionicons name="gift" size={12} color={tierColor} /> {r.rewardValue || r.rewardType}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, adding && s.btnDim]}
              onPress={addStamp}
              disabled={adding}
              activeOpacity={0.8}
            >
              {adding ? <ActivityIndicator color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={s.btnText}>ADD STAMP</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.ghost} onPress={reset} activeOpacity={0.7}>
              <Text style={s.ghostText}>DONE / NEW CUSTOMER</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Fallback in-view QR scanner */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={s.scannerWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={s.scanOverlay}>
            <View style={s.scanFrame} />
            <Text style={s.scanHint}>Point at the customer's loyalty QR code</Text>
          </View>
          <TouchableOpacity style={s.scanClose} onPress={() => setShowCamera(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showPopup} transparent animationType="fade" onRequestClose={confirmPopup}>
        <View style={s.overlay}>
          <View style={s.popup}>
            <Text style={s.popupTitle}>Give {userData?.name || 'customer'} the following:</Text>
            {claimedRewards.map(r => {
              const def = deferred.has(r.id);
              return (
                <View key={r.id} style={[s.popupRow, def && s.popupRowDef]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.popupType}>{r.rewardType}</Text>
                    <Text style={s.popupVal}>{r.rewardValue || '—'}</Text>
                  </View>
                  <TouchableOpacity style={[s.deferBtn, def && s.deferBtnOn]} onPress={() => toggleDefer(r.id)} activeOpacity={0.7}>
                    <Text style={[s.deferText, def && s.deferTextOn]}>{def ? '↩ Undo' : 'Next visit'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {deferred.size > 0 && (
              <Text style={s.deferNote}>{deferred.size} reward{deferred.size > 1 ? 's' : ''} saved for next visit.</Text>
            )}
            <TouchableOpacity style={s.btn} onPress={confirmPopup} activeOpacity={0.8}>
              <Text style={s.btnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(T) { return StyleSheet.create({
  wrap: { flex: 1 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 18, marginBottom: 14 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 14 },
  help: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.red, paddingVertical: 16, marginBottom: 16 },
  scanBtnText: { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 3, color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontFamily: T.fontBodyMd, fontSize: 11, color: T.textFaint, letterSpacing: 1 },
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 20 },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#fff', borderRadius: 4 },
  scanHint: { fontFamily: T.fontBodyMd, fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: 40, letterSpacing: 0.5 },
  scanClose: { position: 'absolute', top: 52, right: 20, width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  input: { flex: 1, color: T.text, fontFamily: T.fontBody, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
  inputClear: { paddingHorizontal: 12 },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 10, marginTop: 10, marginBottom: 4 },
  msgText: { fontFamily: T.fontBodyMd, fontSize: 13, flex: 1 },

  customer: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, padding: 14, marginTop: 16 },
  custHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  custName: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 1, color: T.text, lineHeight: 24 },
  custEmail: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginTop: 1 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  tierText: { fontFamily: T.fontBodyBd, fontSize: 11, color: '#fff', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  statMid: { borderLeftWidth: 0, borderRightWidth: 0 },
  statNum: { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 1, lineHeight: 28, marginBottom: 2 },
  statLabel: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 1.5, color: T.textDim, textTransform: 'uppercase' },
  bdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  bdText: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textDim },
  pending: { borderWidth: 1, padding: 12, marginBottom: 12 },
  pendingTitle: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim, textTransform: 'uppercase', marginBottom: 6 },
  pendingItem: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.text, lineHeight: 22 },
  ghost: { borderWidth: 1, borderColor: T.border, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  ghostText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, borderTopColor: T.red, padding: 24, width: '100%', maxWidth: 400 },
  popupTitle: { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 2, color: T.text, textAlign: 'center', marginBottom: 16 },
  popupRow: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)', backgroundColor: 'rgba(196,30,58,0.06)' },
  popupRowDef: { opacity: 0.5, borderColor: T.border, backgroundColor: 'transparent' },
  popupType: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 2 },
  popupVal: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  deferBtn: { borderWidth: 1, borderColor: T.red, paddingHorizontal: 10, paddingVertical: 5 },
  deferBtnOn: { borderColor: T.border },
  deferText: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.red },
  deferTextOn: { color: T.textDim },
  deferNote: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.textDim, textAlign: 'center', marginVertical: 10, fontStyle: 'italic' },

  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 10, minHeight: 50 },
  btnDim: { opacity: 0.4 },
  btnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
