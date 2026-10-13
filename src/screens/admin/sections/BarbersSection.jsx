import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = ['Barbers', 'Availability'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BarbersSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [tab, setTab] = useState('Barbers');

  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'Barbers'      && <BarbersTab T={T} s={s} />}
      {tab === 'Availability' && <AvailabilityTab T={T} s={s} />}
    </View>
  );
}

// Working-day picker, Monday first (values are JS weekdays: 0 = Sunday)
const WEEK = [[1,'M'],[2,'T'],[3,'W'],[4,'T'],[5,'F'],[6,'S'],[0,'S']];

/* ── Combined barbers list: profiles + working days + today toggle ── */
function BarbersTab({ T, s }) {
  const [barbers,    setBarbers]    = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState({ displayName: '', bio: '', userId: '', isBookable: true });
  const [saving,     setSaving]     = useState(false);
  const [togglingBookable, setTogglingBookable] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [br, sr] = await Promise.all([
        api.get('/barber-profiles'),
        api.get('/barber-profiles/staff-users').catch(() => ({ data: [] })),
      ]);
      setBarbers(br.data || []);
      setStaffUsers(sr.data || []);
    } catch { Alert.alert('Error', 'Could not load barber profiles.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Replace one barber with the server's copy (it works out workingToday)
  const applyUpdate = (updated) =>
    setBarbers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));

  // "Today only" change: lapses at midnight, then the regular days apply again
  const toggleToday = async (barber) => {
    setToggling(barber.id);
    try {
      const { data } = await api.put(`/barber-profiles/${barber.id}/working-today`, { workingToday: !barber.workingToday });
      applyUpdate(data);
    } catch { Alert.alert('Error', 'Could not update.'); }
    finally { setToggling(null); }
  };

  const toggleDay = async (barber, day) => {
    const current = barber.workingDays || [];
    const workingDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setToggling(barber.id);
    try {
      const { data } = await api.put(`/barber-profiles/${barber.id}/working-days`, { workingDays });
      applyUpdate(data);
    } catch { Alert.alert('Error', 'Could not save working days.'); }
    finally { setToggling(null); }
  };

  const toggleBookable = async (barber) => {
    setTogglingBookable(barber.id);
    try {
      await api.put(`/barber-profiles/${barber.id}`, { isBookable: !barber.isBookable });
      setBarbers(prev => prev.map(b => b.id === barber.id ? { ...b, isBookable: !b.isBookable } : b));
    } catch { Alert.alert('Error', 'Could not update.'); }
    finally { setTogglingBookable(null); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ displayName: '', bio: '', userId: '', isBookable: true });
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ displayName: b.displayName || '', bio: b.bio || '', userId: String(b.userId || ''), isBookable: b.isBookable !== false });
    setShowForm(true);
  };

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.displayName.trim()) { Alert.alert('Required', 'Name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/barber-profiles/${editing.id}`, {
          displayName: form.displayName,
          bio:         form.bio,
          isBookable:  form.isBookable,
        });
      } else {
        await api.post('/barber-profiles', {
          displayName: form.displayName,
          bio:         form.bio,
          userId:      form.userId || undefined,
          isBookable:  form.isBookable,
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const remove = (b) => {
    Alert.alert('Delete Barber', `Remove ${b.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/barber-profiles/${b.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const resetPin = (b) => {
    if (!b.userId) { Alert.alert('No user linked', 'This barber has no linked user account.'); return; }
    Alert.alert('Reset PIN', `Reset PIN for ${b.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: async () => {
        try {
          const r = await api.put(`/auth/admin/users/${b.userId}/reset-pin`);
          Alert.alert('PIN Reset', `New PIN: ${r.data.pin}`);
        } catch { Alert.alert('Error', 'Could not reset PIN.'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.hint}>
          Tap the days each barber normally works and the "Who's In Today" chairs update
          themselves every day. Use the switch for a one-off change (sick day, swapped shift):
          it only affects today and resets at midnight.
        </Text>

        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>ADD BARBER</Text>
        </TouchableOpacity>

        {barbers.length === 0 && (
          <Text style={s.empty}>No barbers yet. Add one above.</Text>
        )}

        {barbers.map(b => (
          <View key={b.id} style={[s.card, b.workingToday && s.cardActive]}>
            <View style={s.cardRow}>
              <View style={[s.avatar, b.workingToday && s.avatarActive]}>
                <Text style={s.avatarText}>{(b.displayName || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.barberName}>{b.displayName}</Text>
                {b.bio ? <Text style={s.barberBio} numberOfLines={2}>{b.bio}</Text> : null}
                <View style={s.dayRow} accessibilityLabel={`${b.displayName}'s working days`}>
                  {WEEK.map(([day, label]) => {
                    const on = (b.workingDays || []).includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[s.dayChip, on && s.dayChipOn]}
                        onPress={() => toggleDay(b, day)}
                        disabled={toggling === b.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]}
                      >
                        <Text style={[s.dayChipText, on && s.dayChipTextOn]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {!(b.workingDays || []).length && <Text style={s.dayHint}>No working days set yet</Text>}
                {b.todayIsOverride && <Text style={s.dayHint}>Today only · back to schedule tomorrow</Text>}
              </View>
              {toggling === b.id
                ? <ActivityIndicator size="small" color="#22c55e" />
                : (
                  <View style={{ alignItems: 'center' }}>
                    <Switch
                      value={!!b.workingToday}
                      onValueChange={() => toggleToday(b)}
                      trackColor={{ true: '#22c55e', false: T.border }}
                      thumbColor={b.workingToday ? '#fff' : T.textFaint}
                    />
                    <Text style={[s.toggleLabel, b.workingToday && s.toggleLabelOn]}>
                      {b.workingToday ? 'In today' : 'Off today'}
                    </Text>
                  </View>
                )
              }
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.bookableChip, b.isBookable && s.bookableChipOn]}
                onPress={() => toggleBookable(b)}
                disabled={togglingBookable === b.id}
              >
                {togglingBookable === b.id
                  ? <ActivityIndicator size="small" color={b.isBookable ? '#22c55e' : T.textDim} />
                  : <Text style={[s.bookableChipText, b.isBookable && s.bookableChipTextOn]}>
                      {b.isBookable ? 'Bookable' : 'Not bookable'}
                    </Text>
                }
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(b)}>
                <Ionicons name="pencil-outline" size={15} color={T.textDim} />
              </TouchableOpacity>
              {b.userId ? (
                <TouchableOpacity style={s.iconBtn} onPress={() => resetPin(b)}>
                  <Ionicons name="key-outline" size={15} color={T.gold} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(b)}>
                <Ionicons name="trash-outline" size={15} color={T.red} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.formSheet} onPress={() => {}}>
            <View style={s.formHeader}>
              <Text style={s.formTitle}>{editing ? 'EDIT BARBER' : 'NEW BARBER'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={20} color={T.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.formScroll}>
              <Text style={s.fieldLabel}>NAME *</Text>
              <TextInput
                style={s.input}
                value={form.displayName}
                onChangeText={set('displayName')}
                placeholder="Barber's name"
                placeholderTextColor={T.textFaint}
              />
              <Text style={s.fieldLabel}>BIO / SPECIALTY</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.bio}
                onChangeText={set('bio')}
                placeholder="e.g. Specialises in fades & afro hair"
                placeholderTextColor={T.textFaint}
                multiline
              />
              <View style={s.bookableRow}>
                <Text style={s.fieldLabel}>BOOKABLE ONLINE</Text>
                <Switch
                  value={!!form.isBookable}
                  onValueChange={set('isBookable')}
                  trackColor={{ true: T.red, false: T.border }}
                  thumbColor="#fff"
                />
              </View>
              {!editing && staffUsers.length > 0 && (
                <>
                  <Text style={s.fieldLabel}>LINK TO STAFF USER (optional)</Text>
                  {staffUsers.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[s.userChip, form.userId === String(u.id) && s.userChipActive]}
                      onPress={() => set('userId')(String(u.id))}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.userChipText, form.userId === String(u.id) && s.userChipTextActive]}>
                        {u.name} ({u.email})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              <TouchableOpacity
                style={[s.addBtn, saving && { opacity: 0.5 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.addBtnText}>SAVE</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ── Availability ── */
function AvailabilityTab({ T, s }) {
  const [barbers,  setBarbers]  = useState([]);
  const [selId,    setSelId]    = useState(null);
  const [avail,    setAvail]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get('/barber-profiles')
      .then(r => { setBarbers(r.data || []); if (r.data?.[0]) setSelId(r.data[0].id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selId) return;
    api.get(`/bookings/availability/${selId}`)
      .then(r => setAvail(r.data.availability || r.data || []))
      .catch(() => setAvail([]));
  }, [selId]);

  const addSlot = async () => {
    if (!selId) return;
    setSaving(true);
    try {
      await api.post('/bookings/availability', { barberId: selId, ...form });
      const r = await api.get(`/bookings/availability/${selId}`);
      setAvail(r.data.availability || r.data || []);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not add.'); }
    finally { setSaving(false); }
  };

  const removeSlot = async (id) => {
    try {
      await api.delete(`/bookings/availability/${id}`);
      setAvail(prev => prev.filter(a => a.id !== id));
    } catch { Alert.alert('Error', 'Could not remove.'); }
  };

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.fieldLabel}>SELECT BARBER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {barbers.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[s.barberChip, selId === b.id && s.barberChipActive]}
            onPress={() => setSelId(b.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.barberChipText, selId === b.id && s.barberChipTextActive]}>{b.displayName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {avail.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardLabel}>CURRENT SLOTS</Text>
          {avail.map(a => (
            <View key={a.id} style={s.slotRow}>
              <Text style={s.slotDay}>{DAYS[a.dayOfWeek]}</Text>
              <Text style={s.slotTime}>{a.startTime} – {a.endTime}</Text>
              <TouchableOpacity onPress={() => removeSlot(a.id)}>
                <Ionicons name="trash-outline" size={15} color={T.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardLabel}>ADD TIME SLOT</Text>
        <Text style={s.fieldLabel}>DAY OF WEEK</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[s.dayChip, form.dayOfWeek === i && s.dayChipActive]}
              onPress={() => set('dayOfWeek')(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.dayChipText, form.dayOfWeek === i && s.dayChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>START TIME</Text>
            <TextInput style={s.input} value={form.startTime} onChangeText={set('startTime')} placeholder="09:00" placeholderTextColor={T.textFaint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>END TIME</Text>
            <TextInput style={s.input} value={form.endTime} onChangeText={set('endTime')} placeholder="17:00" placeholderTextColor={T.textFaint} />
          </View>
        </View>
        <TouchableOpacity style={[s.addBtn, saving && { opacity: 0.5 }]} onPress={addSlot} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.addBtnText}>ADD SLOT</Text>}
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: T.red },
  tabLabel: { fontFamily: T.fontHead, fontSize: 11, letterSpacing: 2, color: T.textDim },
  tabLabelActive: { color: T.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  hint: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 14, lineHeight: 18 },

  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardActive: { borderColor: '#22c55e33', backgroundColor: 'rgba(34,197,94,0.05)' },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },

  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.border, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { backgroundColor: '#22c55e' },
  avatarText: { fontFamily: T.fontHead, fontSize: 18, color: T.text },

  barberName: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text },
  barberBio: { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, marginTop: 2, lineHeight: 16 },

  toggleLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1, color: T.textFaint, marginTop: 2, textTransform: 'uppercase' },
  toggleLabelOn: { color: '#22c55e' },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  dayChip: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { borderColor: T.gold, backgroundColor: T.gold },
  dayChipText: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.textDim },
  dayChipTextOn: { color: '#000' },
  dayHint: { fontFamily: T.fontBody, fontSize: 10, color: T.textFaint, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },
  iconBtn: { width: 34, height: 34, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },

  bookableChip: { paddingHorizontal: 10, height: 34, borderRadius: 4, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  bookableChipOn: { borderColor: '#22c55e66', backgroundColor: 'rgba(34,197,94,0.08)' },
  bookableChipText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 0.5, color: T.textDim, textTransform: 'uppercase' },
  bookableChipTextOn: { color: '#22c55e' },

  bookableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 10 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 32 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  formTitle: { fontFamily: T.fontHead, fontSize: 18, letterSpacing: 2, color: T.text },
  formScroll: { padding: 20 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  userChip: { padding: 10, borderWidth: 1, borderColor: T.border, marginBottom: 6 },
  userChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  userChipText: { fontFamily: T.fontBody, fontSize: 13, color: T.textDim },
  userChipTextActive: { color: T.text },

  barberChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: T.border, marginRight: 8 },
  barberChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  barberChipText: { fontFamily: T.fontBodyBd, fontSize: 12, color: T.textDim },
  barberChipTextActive: { color: T.red },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: T.border, marginRight: 8 },
  dayChipActive: { borderColor: T.red, backgroundColor: T.redDim },
  dayChipText: { fontFamily: T.fontBodyBd, fontSize: 11, color: T.textDim },
  dayChipTextActive: { color: T.red },
  slotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border, gap: 10 },
  slotDay: { fontFamily: T.fontBodyBd, fontSize: 12, color: T.text, width: 36 },
  slotTime: { flex: 1, fontFamily: T.fontBody, fontSize: 13, color: T.textDim },
}); }
