import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = ['Denominations', 'Codes', 'Lookup'];
const fmtCcy = (n) => `£${Number(n || 0).toFixed(2)}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export default function GiftCardsSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [tab, setTab] = useState('Denominations');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'Denominations' && <DenomTab T={T} s={s} />}
      {tab === 'Codes'         && <CodesTab T={T} s={s} />}
      {tab === 'Lookup'        && <LookupTab T={T} s={s} />}
    </View>
  );
}

function DenomTab({ T, s }) {
  const [denoms,   setDenoms]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ amount: '', label: '' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/gift-cards/denominations/all'); setDenoms(r.data.denominations || r.data || []); }
    catch { Alert.alert('Error', 'Could not load denominations.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ amount: '', label: '' }); setShowForm(true); };
  const openEdit = (d) => { setEditing(d); setForm({ amount: String(d.amount), label: d.label || '' }); setShowForm(true); };
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.amount) { Alert.alert('Required', 'Amount is required.'); return; }
    setSaving(true);
    try {
      const body = { amount: Number(form.amount), label: form.label };
      if (editing) { await api.put(`/gift-cards/denominations/${editing.id}`, body); }
      else { await api.post('/gift-cards/denominations', body); }
      setShowForm(false); load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = (d) => {
    Alert.alert('Delete', `Remove ${fmtCcy(d.amount)} denomination?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/gift-cards/denominations/${d.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>ADD DENOMINATION</Text>
        </TouchableOpacity>
        {denoms.map(d => (
          <View key={d.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.denomAmt}>{fmtCcy(d.amount)}</Text>
              {d.label && <Text style={s.denomLabel}>{d.label}</Text>}
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(d)}>
              <Ionicons name="pencil-outline" size={14} color={T.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(d)}>
              <Ionicons name="trash-outline" size={14} color={T.red} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editing ? 'EDIT DENOMINATION' : 'ADD DENOMINATION'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={20} color={T.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>AMOUNT (£) *</Text>
              <TextInput style={s.input} value={form.amount} onChangeText={set('amount')} placeholder="e.g. 25" placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />
              <Text style={s.fieldLabel}>LABEL (optional)</Text>
              <TextInput style={s.input} value={form.label} onChangeText={set('label')} placeholder="e.g. Standard Gift Card" placeholderTextColor={T.textFaint} />
              <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CodesTab({ T, s }) {
  const [codes,   setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  useEffect(() => {
    api.get('/gift-cards/codes')
      .then(r => setCodes(r.data.codes || r.data || []))
      .catch(() => Alert.alert('Error', 'Could not load codes.'))
      .finally(() => setLoading(false));
  }, []);

  const voidCode = (code) => {
    Alert.alert('Void Card', `Void gift card ${code.code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Void', style: 'destructive', onPress: async () => {
        setActing(code.id);
        try {
          await api.put(`/gift-cards/codes/${code.id}/void`);
          setCodes(prev => prev.map(c => c.id === code.id ? { ...c, isVoided: true } : c));
        } catch { Alert.alert('Error', 'Could not void.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={codes}
      keyExtractor={c => String(c.id)}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      ListEmptyComponent={<Text style={s.empty}>No gift card codes.</Text>}
      renderItem={({ item: c }) => (
        <View style={[s.row, c.isVoided && { opacity: 0.5 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.codeText}>{c.code}</Text>
            <Text style={s.codeMeta}>Balance: {fmtCcy(c.balance)} / {fmtCcy(c.amount)} · {fmtDate(c.createdAt)}</Text>
            {c.isVoided && <Text style={{ fontFamily: T.fontBodyBd, fontSize: 9, color: T.red, letterSpacing: 1 }}>VOIDED</Text>}
          </View>
          {!c.isVoided && (
            acting === c.id
              ? <ActivityIndicator size="small" color={T.red} />
              : <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => voidCode(c)}>
                  <Ionicons name="ban-outline" size={14} color={T.red} />
                </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

function LookupTab({ T, s }) {
  const [code,    setCode]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount,  setAmount]  = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error,   setError]   = useState('');

  const lookup = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.get(`/gift-cards/codes/lookup?code=${encodeURIComponent(c)}`);
      setResult(r.data);
    } catch (err) { setError(err.response?.data?.message || 'Code not found.'); }
    finally { setLoading(false); }
  };

  const redeem = async () => {
    if (!result || !amount) return;
    setRedeeming(true); setError('');
    try {
      await api.post('/gift-cards/codes/redeem', { code: result.code, amount: Number(amount) });
      Alert.alert('Redeemed', `${fmtCcy(amount)} deducted from gift card.`);
      setResult(null); setCode(''); setAmount('');
    } catch (err) { setError(err.response?.data?.message || 'Could not redeem.'); }
    finally { setRedeeming(false); }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>GIFT CARD LOOKUP</Text>
        <Text style={s.fieldLabel}>CODE</Text>
        <TextInput
          style={s.input}
          value={code}
          onChangeText={c => { setCode(c); setError(''); setResult(null); }}
          placeholder="Enter gift card code"
          placeholderTextColor={T.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={[s.btn, (!code.trim() || loading) && s.btnDim]} onPress={lookup} disabled={!code.trim() || loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>LOOK UP</Text>}
        </TouchableOpacity>

        {!!error && (
          <View style={[s.msgBox, { borderColor: T.red, backgroundColor: T.redDim }]}>
            <Text style={[s.msgText, { color: T.red }]}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={s.resultBox}>
            <Text style={s.cardLabel}>CARD INFO</Text>
            <View style={s.detailRow}><Text style={s.detailKey}>Code</Text><Text style={s.detailVal}>{result.code}</Text></View>
            <View style={s.detailRow}><Text style={s.detailKey}>Total Value</Text><Text style={s.detailVal}>{fmtCcy(result.amount)}</Text></View>
            <View style={s.detailRow}><Text style={s.detailKey}>Remaining Balance</Text><Text style={[s.detailVal, { color: result.balance > 0 ? '#22c55e' : T.red }]}>{fmtCcy(result.balance)}</Text></View>
            <View style={s.detailRow}><Text style={s.detailKey}>Status</Text><Text style={[s.detailVal, { color: result.isVoided ? T.red : '#22c55e' }]}>{result.isVoided ? 'VOIDED' : 'ACTIVE'}</Text></View>
            {!result.isVoided && result.balance > 0 && (
              <>
                <View style={s.divider} />
                <Text style={s.cardLabel}>REDEEM AMOUNT</Text>
                <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="e.g. 10.00" placeholderTextColor={T.textFaint} keyboardType="decimal-pad" />
                <TouchableOpacity style={[s.btn, (!amount || redeeming) && s.btnDim]} onPress={redeem} disabled={!amount || redeeming} activeOpacity={0.8}>
                  {redeeming ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>REDEEM</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: T.red },
  tabLabel: { fontFamily: T.fontHead, fontSize: 10, letterSpacing: 2, color: T.textDim },
  tabLabelActive: { color: T.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  denomAmt: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 1, color: T.gold },
  denomLabel: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginTop: 2 },
  codeText: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, letterSpacing: 1, marginBottom: 3 },
  codeMeta: { fontFamily: T.fontBody, fontSize: 11, color: T.textDim },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 12 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  btn: { backgroundColor: T.red, paddingVertical: 13, alignItems: 'center' },
  btnDim: { opacity: 0.4 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  msgBox: { borderWidth: 1, padding: 10, marginTop: 10 },
  msgText: { fontFamily: T.fontBodyMd, fontSize: 13 },
  resultBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  detailKey: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.textDim },
  detailVal: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.text },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 14 },
}); }
