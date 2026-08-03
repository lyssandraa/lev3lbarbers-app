import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', '__MYSTERY__'];
const TIER_COLORS = { BRONZE: '#d4a853', SILVER: '#8a93a3', GOLD: '#caa400', PLATINUM: '#7d8aa8', __MYSTERY__: '#8b5cf6' };
const TIER_LABELS = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum', __MYSTERY__: 'Mystery' };
const REWARD_TYPES = ['RANDOM', 'CUSTOM', 'MYSTERY_BOX'];
const BLANK = { tier: 'BRONZE', milestone: '1', rewardType: 'CUSTOM', rewardValue: '' };

export default function RewardPoolSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [rewards,  setRewards]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [openTier, setOpenTier] = useState('BRONZE');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/reward-pool/get-reward-pool');
      setRewards(r.data.rewards || r.data || []);
    } catch { Alert.alert('Error', 'Could not load reward pool.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = (tier) => {
    setEditing(null);
    setForm({ ...BLANK, tier });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ tier: r.tier, milestone: String(r.milestone || 1), rewardType: r.rewardType || 'CUSTOM', rewardValue: r.rewardValue || '' });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { tier: form.tier, milestone: Number(form.milestone), rewardType: form.rewardType, rewardValue: form.rewardValue };
      if (editing) {
        await api.put(`/reward-pool/update-reward/${editing.id}`, body);
      } else {
        await api.post('/reward-pool/create-reward-pool', body);
      }
      setShowForm(false); load();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = (r) => {
    Alert.alert('Delete Reward', 'Remove this reward entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/reward-pool/delete-reward/${r.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.intro}>Define what rewards customers receive when they complete loyalty cycles. Each tier can have different rewards at different milestones.</Text>

        {TIERS.map(tier => {
          const col = TIER_COLORS[tier];
          const tierRewards = rewards.filter(r => r.tier === tier).sort((a, b) => (a.milestone || 0) - (b.milestone || 0));
          const isOpen = openTier === tier;

          return (
            <View key={tier} style={[s.tierCard, { borderTopColor: col }]}>
              <TouchableOpacity
                style={s.tierHeader}
                onPress={() => setOpenTier(isOpen ? null : tier)}
                activeOpacity={0.7}
              >
                <View style={[s.tierDot, { backgroundColor: col }]} />
                <Text style={[s.tierName, { color: col }]}>{TIER_LABELS[tier]}</Text>
                <Text style={s.rewardCount}>{tierRewards.length} reward{tierRewards.length !== 1 ? 's' : ''}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={T.textFaint} />
              </TouchableOpacity>

              {isOpen && (
                <View style={s.tierBody}>
                  {tierRewards.length === 0 && (
                    <Text style={s.empty}>No rewards set for {TIER_LABELS[tier]}.</Text>
                  )}
                  {tierRewards.map(r => (
                    <View key={r.id} style={s.rewardRow}>
                      <View style={[s.milestoneBadge, { backgroundColor: col + '33' }]}>
                        <Text style={[s.milestoneNum, { color: col }]}>×{r.milestone}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rewardType}>{r.rewardType}</Text>
                        {r.rewardValue && <Text style={s.rewardValue}>{r.rewardValue}</Text>}
                      </View>
                      <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(r)}>
                        <Ionicons name="pencil-outline" size={13} color={T.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(r)}>
                        <Ionicons name="trash-outline" size={13} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[s.addTierBtn, { borderColor: col }]} onPress={() => openAdd(tier)} activeOpacity={0.7}>
                    <Ionicons name="add" size={14} color={col} />
                    <Text style={[s.addTierBtnText, { color: col }]}>Add reward</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editing ? 'EDIT REWARD' : 'ADD REWARD'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={20} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>TIER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {TIERS.map(t => (
                  <TouchableOpacity key={t} style={[s.tierChip, form.tier === t && { borderColor: TIER_COLORS[t], backgroundColor: TIER_COLORS[t] + '22' }]} onPress={() => set('tier')(t)} activeOpacity={0.7}>
                    <Text style={[s.tierChipText, form.tier === t && { color: TIER_COLORS[t] }]}>{TIER_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.fieldLabel}>MILESTONE (cycle number)</Text>
              <TextInput style={s.input} value={form.milestone} onChangeText={set('milestone')} keyboardType="numeric" placeholder="e.g. 1" placeholderTextColor={T.textFaint} />

              <Text style={s.fieldLabel}>REWARD TYPE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {REWARD_TYPES.map(rt => (
                  <TouchableOpacity key={rt} style={[s.typeChip, form.rewardType === rt && s.typeChipActive]} onPress={() => set('rewardType')(rt)} activeOpacity={0.7}>
                    <Text style={[s.typeChipText, form.rewardType === rt && s.typeChipTextActive]}>{rt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.rewardType === 'CUSTOM' && (
                <>
                  <Text style={s.fieldLabel}>REWARD VALUE</Text>
                  <TextInput style={s.input} value={form.rewardValue} onChangeText={set('rewardValue')} placeholder="e.g. Free beard trim" placeholderTextColor={T.textFaint} />
                </>
              )}

              <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE REWARD</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  intro: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  tierCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, marginBottom: 10 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, flex: 1 },
  rewardCount: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  tierBody: { borderTopWidth: 1, borderTopColor: T.border, padding: 12 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  milestoneBadge: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  milestoneNum: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 1 },
  rewardType: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim, textTransform: 'uppercase', marginBottom: 2 },
  rewardValue: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.text },
  iconBtn: { width: 30, height: 30, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-start' },
  addTierBtnText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 0.5 },
  empty: { fontFamily: T.fontBody, fontSize: 12, color: T.textFaint, marginBottom: 10 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', borderTopWidth: 1, borderTopColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  tierChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: T.border, marginRight: 8 },
  tierChipText: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.textDim },
  typeChip: { borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 7 },
  typeChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  typeChipText: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.textDim },
  typeChipTextActive: { color: T.red },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
}); }
