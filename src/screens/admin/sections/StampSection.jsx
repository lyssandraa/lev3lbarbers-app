import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
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

// Reward values are free text set by admin (e.g. "10% off", "£5 off a cut") —
// best-effort detection so the calculator can pre-fill a likely discount,
// staff can always override it.
function detectDiscount(text) {
  if (!text) return null;
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { type: 'PERCENT', value: pct[1] };
  const fixed = text.match(/£\s*(\d+(?:\.\d+)?)/);
  if (fixed) return { type: 'FIXED', value: fixed[1] };
  return null;
}
const fmtGbp = (n) => `£${(Math.round(n * 100) / 100).toFixed(2)}`;

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

  const [showCalc,      setShowCalc]      = useState(false);
  const [allServices,   setAllServices]   = useState(null);
  const [calcLoading,   setCalcLoading]   = useState(false);
  const [calcSelected,  setCalcSelected]  = useState(new Set());
  const [discountType,  setDiscountType]  = useState('NONE'); // NONE | PERCENT | FIXED
  const [discountValue, setDiscountValue] = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const scanSound = useAudioPlayer(SCAN_SOUND);

  // iOS mutes app audio by default when the hardware silent switch is on —
  // without this the scan chime silently never plays on a muted device.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

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
    scanSound.seekTo(0).then(() => scanSound.play()).catch(err => console.warn('scan sound failed', err));
  }, [lookupUser, scanSound]);

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

  const openCalc = useCallback(async () => {
    setCalcSelected(new Set());
    const guess = userData?.pendingRewards?.map(r => detectDiscount(r.rewardValue)).find(Boolean);
    if (guess) { setDiscountType(guess.type); setDiscountValue(guess.value); }
    else { setDiscountType('NONE'); setDiscountValue(''); }
    setShowCalc(true);
    // Refetch every time rather than caching — prices can change mid-shift
    // (another admin editing Services while this tab stays mounted), and a
    // stale price silently baked into a customer's total is worse than an
    // extra request.
    setCalcLoading(true);
    try {
      const res = await api.get('/services/all-services');
      setAllServices(res.data.allServices || []);
    } catch {
      setAllServices(prev => prev || []);
    } finally { setCalcLoading(false); }
  }, [userData]);

  const toggleCalcService = (id) => {
    setCalcSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const calcSubtotal = useMemo(() => {
    if (!allServices) return 0;
    return allServices
      .filter(svc => calcSelected.has(svc.id))
      .reduce((sum, svc) => sum + (Number(svc.price) || 0), 0);
  }, [allServices, calcSelected]);

  const calcDiscountAmount = useMemo(() => {
    const v = Number(discountValue) || 0;
    if (discountType === 'PERCENT') return calcSubtotal * (Math.min(v, 100) / 100);
    if (discountType === 'FIXED') return Math.min(v, calcSubtotal);
    return 0;
  }, [discountType, discountValue, calcSubtotal]);

  const calcTotal = Math.max(0, calcSubtotal - calcDiscountAmount);


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

            <TouchableOpacity style={s.calcBtn} onPress={openCalc} activeOpacity={0.8}>
              <Ionicons name="calculator-outline" size={16} color={T.text} />
              <Text style={s.calcBtnText}>CALCULATE TOTAL</Text>
            </TouchableOpacity>

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
        <Pressable style={s.overlay} onPress={confirmPopup}>
          <Pressable style={s.popup} onPress={() => {}}>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCalc} transparent animationType="fade" onRequestClose={() => setShowCalc(false)}>
        <Pressable style={s.overlay} onPress={() => setShowCalc(false)}>
          <Pressable style={s.calcSheet} onPress={() => {}}>
            <View style={s.sheetHeaderRow}>
              <Text style={s.popupTitle}>CALCULATE TOTAL</Text>
              <TouchableOpacity onPress={() => setShowCalc(false)}>
                <Ionicons name="close" size={20} color={T.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={s.calcSectionLabel}>SERVICES DONE</Text>
              {calcLoading ? (
                <ActivityIndicator color={T.red} style={{ marginVertical: 20 }} />
              ) : (
                <View style={s.calcSvcGrid}>
                  {(allServices || []).map(svc => {
                    const on = calcSelected.has(svc.id);
                    return (
                      <TouchableOpacity
                        key={svc.id}
                        style={[s.calcSvcRow, on && s.calcSvcRowOn]}
                        onPress={() => toggleCalcService(svc.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? T.red : T.textDim} />
                        <Text style={s.calcSvcName} numberOfLines={1}>{svc.name}</Text>
                        <Text style={s.calcSvcPrice}>{svc.price != null ? fmtGbp(svc.price) : '—'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {(!allServices || allServices.length === 0) && (
                    <Text style={s.calcEmpty}>No services set up yet.</Text>
                  )}
                </View>
              )}

              <Text style={s.calcSectionLabel}>DISCOUNT</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[['NONE', 'None'], ['PERCENT', '% OFF'], ['FIXED', '£ OFF']].map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.calcTypeBtn, discountType === val && s.calcTypeBtnActive]}
                    onPress={() => setDiscountType(val)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.calcTypeText, discountType === val && s.calcTypeTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {discountType !== 'NONE' && (
                <TextInput
                  style={s.input}
                  value={String(discountValue)}
                  onChangeText={setDiscountValue}
                  placeholder={discountType === 'PERCENT' ? 'e.g. 10' : 'e.g. 5.00'}
                  placeholderTextColor={T.textFaint}
                  keyboardType="decimal-pad"
                />
              )}

              <View style={s.calcTotals}>
                <View style={s.calcTotalRow}>
                  <Text style={s.calcTotalLabel}>Subtotal</Text>
                  <Text style={s.calcTotalVal}>{fmtGbp(calcSubtotal)}</Text>
                </View>
                {calcDiscountAmount > 0 && (
                  <View style={s.calcTotalRow}>
                    <Text style={s.calcTotalLabel}>Discount</Text>
                    <Text style={[s.calcTotalVal, { color: T.red }]}>-{fmtGbp(calcDiscountAmount)}</Text>
                  </View>
                )}
                <View style={[s.calcTotalRow, s.calcTotalFinal]}>
                  <Text style={s.calcTotalFinalLabel}>TOTAL</Text>
                  <Text style={s.calcTotalFinalVal}>{fmtGbp(calcTotal)}</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[s.btn, { marginTop: 14 }]} onPress={() => setShowCalc(false)} activeOpacity={0.8}>
              <Text style={s.btnText}>DONE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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

  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: T.border, paddingVertical: 13, marginBottom: 4 },
  calcBtnText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.text },

  calcSheet: {
    backgroundColor: T.bg,
    width: '92%', maxWidth: 620, maxHeight: '85%',
    padding: 22,
    borderWidth: 1, borderColor: T.border, borderTopWidth: 3, borderTopColor: T.red,
  },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calcSectionLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  // Two columns on wide layouts (landscape iPad), collapses to one when
  // the sheet is narrower (portrait / smaller screens) — pure flexbox,
  // no orientation detection needed.
  calcSvcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  calcSvcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, borderWidth: 1, borderColor: T.border, minWidth: 220, flexGrow: 1, flexBasis: '46%' },
  calcSvcRowOn: { borderColor: T.red, backgroundColor: T.redDim },
  calcSvcName: { flex: 1, fontFamily: T.fontBodyMd, fontSize: 13, color: T.text },
  calcSvcPrice: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.textDim },
  calcEmpty: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, textAlign: 'center', paddingVertical: 20 },
  calcTypeBtn: { flex: 1, borderWidth: 1, borderColor: T.border, paddingVertical: 11, alignItems: 'center' },
  calcTypeBtnActive: { borderColor: T.red, backgroundColor: T.redDim },
  calcTypeText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: T.textDim },
  calcTypeTextActive: { color: T.red },
  calcTotals: { borderWidth: 1, borderColor: T.border, padding: 14, marginTop: 6, marginBottom: 14, gap: 6 },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcTotalLabel: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
  calcTotalVal: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.text },
  calcTotalFinal: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10, marginTop: 4 },
  calcTotalFinalLabel: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.text },
  calcTotalFinalVal: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 1, color: T.red },

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
