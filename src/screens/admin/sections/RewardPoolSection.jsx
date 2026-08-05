import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const BONUS_STAMP_SENTINEL = '__BONUS_STAMP__';

const TIER_META = [
  { key: 'BRONZE',      label: 'Bronze',      color: '#a8732e', cardOrder: 1 },
  { key: 'SILVER',      label: 'Silver',      color: '#6b7585', cardOrder: 2 },
  { key: 'GOLD',        label: 'Gold',        color: '#a9870a', cardOrder: 3 },
  { key: 'PLATINUM',    label: 'Platinum',    color: '#5a6b8c', cardOrder: 4 },
  { key: '__MYSTERY__', label: 'Mystery Box', color: '#7c5cd4', cardOrder: null },
];

// Milestone stamp numbers aren't stored anywhere — they're computed fresh
// from the loyalty settings every time, same as the website.
function milestonesForTier(tierKey, ls) {
  if (!ls || tierKey === '__MYSTERY__') return [];
  const { bronzeMax, silverMax, goldMax, cycleLength, rewardInterval } = ls;
  const ranges = {
    BRONZE:   [1,            bronzeMax],
    SILVER:   [bronzeMax + 1, silverMax],
    GOLD:     [silverMax + 1, goldMax],
    PLATINUM: [goldMax + 1,   cycleLength],
  };
  const [start, end] = ranges[tierKey] || [1, 9];
  const milestones = [];
  const first = Math.ceil(start / rewardInterval) * rewardInterval;
  for (let m = first; m <= end; m += rewardInterval) milestones.push(m);
  return milestones;
}

function ruleToPicker(rule) {
  if (!rule) return { type: 'RANDOM', text: '' };
  if (rule.rewardIsMystery) return { type: 'MYSTERY_BOX', text: '' };
  if (rule.rewardValue === BONUS_STAMP_SENTINEL) return { type: 'BONUS_STAMP', text: '' };
  return { type: 'CUSTOM', text: rule.rewardValue || '' };
}

function RewardPicker({ label, value, onChange, showRandom, T, s }) {
  const type = value?.type || 'CUSTOM';
  const options = [
    ...(showRandom ? [{ key: 'RANDOM', label: 'Random' }] : []),
    { key: 'CUSTOM', label: 'Custom' },
    { key: 'MYSTERY_BOX', label: 'Mystery Box' },
    { key: 'BONUS_STAMP', label: 'Bonus Stamp' },
  ];
  return (
    <View style={s.pickerWrap}>
      {label && <Text style={s.pickerLabel}>{label}</Text>}
      <View style={s.pickerRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.pickerChip, type === opt.key && s.pickerChipActive]}
            onPress={() => onChange({ type: opt.key, text: value?.text || '' })}
            activeOpacity={0.7}
          >
            <Text style={[s.pickerChipText, type === opt.key && s.pickerChipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {type === 'RANDOM' && (
        <Text style={s.pickerHint}>Draws randomly from this tier's weighted pool below.</Text>
      )}
      {type === 'CUSTOM' && (
        <TextInput
          style={s.pickerInput}
          placeholder="e.g. Free nose wax, 10% off next cut"
          placeholderTextColor={T.textFaint}
          value={value?.text || ''}
          onChangeText={t => onChange({ ...value, text: t })}
        />
      )}
      {type === 'MYSTERY_BOX' && (
        <Text style={s.pickerHint}>A mystery box reward is issued automatically.</Text>
      )}
      {type === 'BONUS_STAMP' && (
        <Text style={s.pickerHint}>Adds 1 bonus stamp to their card immediately. No extra visit needed.</Text>
      )}
    </View>
  );
}

export default function RewardPoolSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [pool, setPool] = useState([]);
  const [cards, setCards] = useState([]);
  const [ls, setLs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState('BRONZE');
  const [milestoneEdits, setMilestoneEdits] = useState({});
  const [savingMilestones, setSavingMilestones] = useState(null);
  const [milestoneMsg, setMilestoneMsg] = useState({});
  const [newReward, setNewReward] = useState({ reward: '', weight: '50' });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ reward: '', weight: '50' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [poolRes, cardsRes, lsRes] = await Promise.allSettled([
        api.get('/reward-pool/get-reward-pool'),
        api.get('/stamps/cards'),
        api.get('/loyalty-settings/settings'),
      ]);
      if (poolRes.status === 'fulfilled') setPool(poolRes.value.data);
      if (cardsRes.status === 'fulfilled') setCards(cardsRes.value.data.cards || []);
      if (lsRes.status === 'fulfilled') setLs(lsRes.value.data.settings);
    } catch {
      Alert.alert('Error', 'Could not load reward data.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const getMilestoneState = useCallback((tierKey) => {
    const meta = TIER_META.find(t => t.key === tierKey);
    if (!meta || !ls) return {};
    const milestones = milestonesForTier(tierKey, ls);
    const card = cards.find(c => c.order === meta.cardOrder);
    const state = {};
    milestones.forEach(stampCount => {
      const rule = card?.rules.find(r => r.stampCount === stampCount);
      state[stampCount] = ruleToPicker(rule);
    });
    return state;
  }, [cards, ls]);

  const openTier = (key) => {
    const next = expanded === key ? null : key;
    setExpanded(next);
    if (next && next !== '__MYSTERY__' && !milestoneEdits[next]) {
      setMilestoneEdits(e => ({ ...e, [next]: getMilestoneState(next) }));
    }
  };

  const updateMilestone = (tierKey, stampCount, val) => {
    setMilestoneEdits(e => ({ ...e, [tierKey]: { ...(e[tierKey] || {}), [stampCount]: val } }));
  };

  const saveMilestones = async (tierKey) => {
    const meta = TIER_META.find(t => t.key === tierKey);
    if (!meta) return;
    setSavingMilestones(tierKey);
    const edits = milestoneEdits[tierKey] || {};
    const milestones = milestonesForTier(tierKey, ls);

    const rules = milestones
      .filter(m => edits[m]?.type !== 'RANDOM' && edits[m] !== undefined)
      .map(m => {
        const v = edits[m];
        let rewardValue = null;
        if (v.type === 'CUSTOM') rewardValue = v.text || null;
        else if (v.type === 'BONUS_STAMP') rewardValue = BONUS_STAMP_SENTINEL;
        return {
          stampCount: m,
          rewardType: v.type === 'MYSTERY_BOX' ? 'Mystery box' : 'Stamp',
          rewardValue,
          rewardIsMystery: v.type === 'MYSTERY_BOX',
        };
      });

    try {
      const card = cards.find(c => c.order === meta.cardOrder);
      if (card) {
        await api.put(`/stamps/cards/${card.id}`, { name: card.name, order: card.order, rules });
      } else {
        await api.post('/stamps/cards', { name: meta.label, order: meta.cardOrder, rules });
      }
      setMilestoneMsg(m => ({ ...m, [tierKey]: 'Saved' }));
      setTimeout(() => setMilestoneMsg(m => ({ ...m, [tierKey]: '' })), 3000);
      const res = await api.get('/stamps/cards');
      setCards(res.data.cards || []);
    } catch {
      setMilestoneMsg(m => ({ ...m, [tierKey]: 'Failed to save' }));
    } finally {
      setSavingMilestones(null);
    }
  };

  const addReward = async (tierKey) => {
    if (!newReward.reward.trim()) return;
    const isMystery = tierKey === '__MYSTERY__';
    try {
      await api.post('/reward-pool/create-reward-pool', {
        reward: newReward.reward.trim(),
        weight: parseInt(newReward.weight, 10) || 1,
        tier: isMystery ? null : tierKey,
        type: isMystery ? 'Mystery box' : tierKey,
      });
      setNewReward({ reward: '', weight: '50' });
      const res = await api.get('/reward-pool/get-reward-pool');
      setPool(res.data);
    } catch {
      Alert.alert('Error', 'Could not add reward.');
    }
  };

  const addBonusStamp = async (tierKey) => {
    const isMystery = tierKey === '__MYSTERY__';
    try {
      await api.post('/reward-pool/create-reward-pool', {
        reward: BONUS_STAMP_SENTINEL,
        weight: parseInt(newReward.weight, 10) || 1,
        tier: isMystery ? null : tierKey,
        type: isMystery ? 'Mystery box' : tierKey,
      });
      const res = await api.get('/reward-pool/get-reward-pool');
      setPool(res.data);
    } catch {
      Alert.alert('Error', 'Could not add bonus stamp option.');
    }
  };

  const saveEdit = async (id) => {
    try {
      const item = pool.find(r => r.id === id);
      await api.put(`/reward-pool/update-reward/${id}`, {
        reward: editValues.reward,
        weight: parseInt(editValues.weight, 10) || 1,
        tier: item.tier,
        type: item.type,
      });
      setEditingId(null);
      const res = await api.get('/reward-pool/get-reward-pool');
      setPool(res.data);
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    }
  };

  const deleteReward = (id, label) => {
    Alert.alert('Delete Reward', `Remove "${label}" from the pool?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/reward-pool/delete-reward/${id}`);
          setPool(prev => prev.filter(r => r.id !== id));
        } catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.introBox}>
        <Text style={s.introTitle}>How rewards work</Text>
        <Text style={s.introText}>There are two ways a customer can get a reward when they hit a reward stamp.</Text>
        <Text style={s.introBullet}>
          <Text style={s.introBold}>Fixed milestone rules. </Text>
          Set an exact reward for an exact stamp number. For example, stamp #3 always gives a free nose wax. Guaranteed, not random.
        </Text>
        <Text style={s.introBullet}>
          <Text style={s.introBold}>Weighted random pool. </Text>
          For any reward stamp with no fixed rule, one item is drawn at random from that tier's pool below. Higher weight means more likely to be picked. 70 vs 30 is a 70%/30% chance.
        </Text>
        <Text style={s.introText}>Fixed rules always take priority over the pool.</Text>
      </View>

      {TIER_META.map(tier => {
        const isOpen = expanded === tier.key;
        const tierPool = tier.key === '__MYSTERY__'
          ? pool.filter(r => r.type === 'Mystery box')
          : pool.filter(r => r.tier === tier.key);
        const milestones = milestonesForTier(tier.key, ls);
        const edits = milestoneEdits[tier.key] || {};

        return (
          <View key={tier.key} style={[s.tierCard, { borderTopColor: tier.color }]}>
            <TouchableOpacity style={s.tierHeader} onPress={() => openTier(tier.key)} activeOpacity={0.7}>
              <View style={[s.tierDot, { backgroundColor: tier.color }]} />
              <Text style={[s.tierName, { color: tier.color }]}>{tier.label}</Text>
              <Text style={s.rewardCount}>{tierPool.length} in pool</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={T.textFaint} />
            </TouchableOpacity>

            {isOpen && (
              <View style={s.tierBody}>
                {tier.key !== '__MYSTERY__' && milestones.length > 0 && (
                  <>
                    <Text style={s.subLabel}>Fixed Milestone Rules</Text>
                    <Text style={s.subHint}>Set a guaranteed reward at each milestone. Leave as Random to draw from the pool below instead.</Text>
                    {milestones.map(stampCount => (
                      <View key={stampCount} style={s.milestoneRow}>
                        <RewardPicker
                          label={`Stamp #${stampCount}`}
                          value={edits[stampCount] || { type: 'RANDOM', text: '' }}
                          onChange={v => updateMilestone(tier.key, stampCount, v)}
                          showRandom
                          T={T}
                          s={s}
                        />
                      </View>
                    ))}
                    {!!milestoneMsg[tier.key] && (
                      <Text style={[s.milestoneMsg, milestoneMsg[tier.key] === 'Saved' ? s.msgOk : s.msgErr]}>
                        {milestoneMsg[tier.key]}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[s.saveMilestonesBtn, savingMilestones === tier.key && s.btnDim]}
                      onPress={() => saveMilestones(tier.key)}
                      disabled={savingMilestones === tier.key}
                      activeOpacity={0.8}
                    >
                      {savingMilestones === tier.key
                        ? <ActivityIndicator color={T.red} size="small" />
                        : <Text style={s.saveMilestonesBtnText}>SAVE MILESTONE RULES</Text>}
                    </TouchableOpacity>
                    <View style={s.divider} />
                  </>
                )}

                <Text style={s.subLabel}>{tier.key === '__MYSTERY__' ? 'Mystery Box Contents' : 'Weighted Random Pool'}</Text>
                <Text style={s.subHint}>
                  {tier.key === '__MYSTERY__'
                    ? 'Items drawn when a mystery box is issued (signup, referral, etc).'
                    : 'Drawn randomly when a reward stamp has no fixed rule above.'}
                </Text>

                <View style={s.addRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Reward description"
                    placeholderTextColor={T.textFaint}
                    value={newReward.reward}
                    onChangeText={t => setNewReward(n => ({ ...n, reward: t }))}
                  />
                  <TextInput
                    style={s.weightInput}
                    placeholder="Weight"
                    placeholderTextColor={T.textFaint}
                    keyboardType="numeric"
                    value={newReward.weight}
                    onChangeText={t => setNewReward(n => ({ ...n, weight: t }))}
                  />
                  <TouchableOpacity style={s.addBtn} onPress={() => addReward(tier.key)} activeOpacity={0.8}>
                    <Text style={s.addBtnText}>ADD</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.bonusStampBtn} onPress={() => addBonusStamp(tier.key)} activeOpacity={0.7}>
                  <Ionicons name="flash-outline" size={13} color={T.textDim} />
                  <Text style={s.bonusStampBtnText}>Add "Bonus Stamp" option (weight {newReward.weight || 1})</Text>
                </TouchableOpacity>

                {tierPool.length === 0 && <Text style={s.empty}>No rewards in this pool yet.</Text>}
                {tierPool.map(r => (
                  <View key={r.id} style={s.rewardRow}>
                    {editingId === r.id ? (
                      <>
                        {r.reward === BONUS_STAMP_SENTINEL ? (
                          <Text style={s.bonusTag}>Bonus Stamp</Text>
                        ) : (
                          <TextInput style={[s.input, { flex: 1 }]} value={editValues.reward} onChangeText={t => setEditValues(v => ({ ...v, reward: t }))} />
                        )}
                        <TextInput style={s.weightInput} keyboardType="numeric" value={String(editValues.weight)} onChangeText={t => setEditValues(v => ({ ...v, weight: t }))} />
                        <TouchableOpacity style={s.iconBtn} onPress={() => saveEdit(r.id)}>
                          <Ionicons name="checkmark" size={15} color="#2e7d32" />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.iconBtn} onPress={() => setEditingId(null)}>
                          <Ionicons name="close" size={15} color={T.textDim} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {r.reward === BONUS_STAMP_SENTINEL ? (
                          <Text style={s.bonusTag}>Bonus Stamp</Text>
                        ) : (
                          <Text style={s.rewardName}>{r.reward}</Text>
                        )}
                        <Text style={s.weightTag}>w:{r.weight}</Text>
                        <TouchableOpacity style={s.iconBtn} onPress={() => { setEditingId(r.id); setEditValues({ reward: r.reward, weight: String(r.weight) }); }}>
                          <Ionicons name="pencil-outline" size={13} color={T.textDim} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => deleteReward(r.id, r.reward === BONUS_STAMP_SENTINEL ? 'Bonus Stamp' : r.reward)}>
                          <Ionicons name="trash-outline" size={13} color={T.red} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  introBox: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.gold, padding: 14, marginBottom: 16 },
  introTitle: { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 1, color: T.text, marginBottom: 6 },
  introText: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 6 },
  introBullet: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 6 },
  introBold: { fontFamily: T.fontBodyBd, color: T.text },

  tierCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, marginBottom: 10 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, flex: 1 },
  rewardCount: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  tierBody: { borderTopWidth: 1, borderTopColor: T.border, padding: 12 },

  subLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 4 },
  subHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, fontStyle: 'italic', marginBottom: 10, lineHeight: 16 },

  milestoneRow: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, padding: 10, marginBottom: 8 },
  pickerWrap: {},
  pickerLabel: { fontFamily: T.fontBodyBd, fontSize: 12, color: T.text, marginBottom: 6 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  pickerChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  pickerChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  pickerChipText: { fontFamily: T.fontBodyMd, fontSize: 11, color: T.textDim },
  pickerChipTextActive: { color: T.red, fontFamily: T.fontBodyBd },
  pickerHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, fontStyle: 'italic' },
  pickerInput: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 },

  milestoneMsg: { fontFamily: T.fontBodyBd, fontSize: 12, textAlign: 'center', marginBottom: 6 },
  msgOk: { color: '#2e7d32' },
  msgErr: { color: T.red },

  saveMilestonesBtn: { borderWidth: 1, borderColor: T.red, paddingVertical: 10, alignItems: 'center', marginBottom: 4 },
  saveMilestonesBtnText: { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: T.red },
  btnDim: { opacity: 0.5 },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 14 },

  addRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 13, paddingHorizontal: 10, paddingVertical: 9 },
  weightInput: { width: 64, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 13, paddingHorizontal: 8, paddingVertical: 9, textAlign: 'center' },
  addBtn: { backgroundColor: T.red, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: '#fff' },

  bonusStampBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: T.border, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 12 },
  bonusStampBtnText: { fontFamily: T.fontBodyMd, fontSize: 11, color: T.textDim },

  empty: { fontFamily: T.fontBody, fontSize: 12, color: T.textFaint, fontStyle: 'italic', marginBottom: 8 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  rewardName: { flex: 1, fontFamily: T.fontBody, fontSize: 13, color: T.text },
  bonusTag: { flex: 1, fontFamily: T.fontBodyBd, fontSize: 13, color: T.red },
  weightTag: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  iconBtn: { width: 28, height: 28, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
}); }
