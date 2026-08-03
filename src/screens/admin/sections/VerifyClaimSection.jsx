import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

export default function VerifyClaimSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [token,       setToken]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [showCamera,  setShowCamera]  = useState(false);
  const [scanned,     setScanned]     = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const verify = useCallback(async (t) => {
    const tok = (t ?? token).trim();
    if (!tok) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/rewards/verify-claim', { token: tok });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired claim token.');
    } finally { setLoading(false); }
  }, [token]);

  const reset = () => { setToken(''); setResult(null); setError(''); setScanned(false); };

  const handleScan = useCallback((data) => {
    const match = data.match(/CLM-[A-Z0-9]+/i);
    const tok = match ? match[0].toUpperCase() : data.trim().toUpperCase();
    setToken(tok);
    verify(tok);
  }, [verify]);

  const startScan = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }
    if (CameraView.isModernBarcodeScannerAvailable) {
      const sub = CameraView.onModernBarcodeScanned(({ data }) => {
        sub.remove();
        CameraView.dismissScanner();
        handleScan(data);
      });
      await CameraView.launchScanner({ barcodeTypes: ['qr'] });
    } else {
      setScanned(false);
      setShowCamera(true);
    }
  }, [permission, requestPermission, handleScan]);

  const onBarcodeScanned = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);
    setShowCamera(false);
    handleScan(data);
  }, [scanned, handleScan]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>VERIFY CLAIM</Text>
        <Text style={s.help}>
          Ask the customer to show their reward QR code or claim token. Scan the QR code
          or type the token manually to verify and mark it as redeemed.
        </Text>

        {!result && (
          <>
            <TouchableOpacity style={s.scanBtn} onPress={startScan} activeOpacity={0.8}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
              <Text style={s.scanBtnText}>SCAN QR CODE</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or enter manually</Text>
              <View style={s.dividerLine} />
            </View>

            <Text style={s.label}>CLAIM TOKEN</Text>
            <TextInput
              style={s.input}
              value={token}
              onChangeText={t => { setToken(t); setError(''); }}
              placeholder="e.g. CLM-XXXXXXXX"
              placeholderTextColor={T.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => verify()}
            />
            <TouchableOpacity
              style={[s.btn, (!token.trim() || loading) && s.btnDim]}
              onPress={() => verify()}
              disabled={!token.trim() || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={s.row}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                    <Text style={s.btnText}>VERIFY CLAIM</Text>
                  </View>
                )}
            </TouchableOpacity>
          </>
        )}

        {!!error && (
          <View style={[s.msg, { borderColor: T.red, backgroundColor: T.redDim }]}>
            <Ionicons name="alert-circle" size={15} color={T.red} />
            <Text style={[s.msgText, { color: T.red }]}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={s.result}>
            <View style={s.resultIcon}>
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            </View>
            <Text style={s.resultTitle}>CLAIM VERIFIED</Text>
            <Text style={s.resultName}>{result.customerName}</Text>
            <View style={s.rewardBox}>
              <Text style={s.rewardType}>{result.rewardType}</Text>
              <Text style={s.rewardValue}>{result.rewardValue || '—'}</Text>
            </View>
            <Text style={s.resultNote}>This reward has been marked as redeemed.</Text>
            <TouchableOpacity style={s.ghost} onPress={reset} activeOpacity={0.7}>
              <Text style={s.ghostText}>VERIFY ANOTHER</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={{ height: 40 }} />

      {/* Fallback in-view camera (for devices where launchScanner isn't available) */}
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
            <Text style={s.scanHint}>Point at the customer's reward QR code</Text>
          </View>
          <TouchableOpacity style={s.scanClose} onPress={() => setShowCamera(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 18 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 14 },
  help: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 16, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },

  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.red, paddingVertical: 16, marginBottom: 16 },
  scanBtnText: { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 3, color: '#fff' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontFamily: T.fontBodyMd, fontSize: 11, color: T.textFaint, letterSpacing: 1 },

  label: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBodyBd, fontSize: 16, letterSpacing: 2, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 12, marginTop: 12 },
  msgText: { fontFamily: T.fontBodyMd, fontSize: 13, flex: 1 },
  result: { alignItems: 'center', paddingTop: 16 },
  resultIcon: { marginBottom: 12 },
  resultTitle: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 4, color: '#22c55e', marginBottom: 8 },
  resultName: { fontFamily: T.fontBodyBd, fontSize: 16, color: T.text, marginBottom: 16 },
  rewardBox: { borderWidth: 1, borderColor: T.gold, backgroundColor: T.goldDim, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  rewardType: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 4 },
  rewardValue: { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.text },
  resultNote: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, textAlign: 'center', marginBottom: 16 },
  ghost: { borderWidth: 1, borderColor: T.border, paddingVertical: 13, paddingHorizontal: 32, marginTop: 4 },
  ghostText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' },
  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnDim: { opacity: 0.4 },
  btnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },

  scannerWrap: { flex: 1, backgroundColor: '#000' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 20 },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#fff', borderRadius: 4 },
  scanHint: { fontFamily: T.fontBodyMd, fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: 40, letterSpacing: 0.5 },
  scanClose: {
    position: 'absolute', top: 52, right: 20,
    width: 44, height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
}); }
