import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = ['Settings', 'Bookings'];
const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: '#f59e0b', CONFIRMED: '#22c55e', COMPLETED: '#3b82f6',
  CANCELLED: '#ef4444', REFUNDED: '#8b5cf6',
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

export default function BookingsSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [tab, setTab] = useState('Settings');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'Settings' && <SettingsTab T={T} s={s} />}
      {tab === 'Bookings' && <BookingsList T={T} s={s} />}
    </View>
  );
}

function SettingsTab({ T, s }) {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ isActive: true, depositPercent: 20, slotDurationMins: 30, cancellationHours: 24 });

  useEffect(() => {
    api.get('/booking-settings')
      .then(r => setForm({ isActive: r.data.isActive ?? true, depositPercent: r.data.depositPercent ?? 20, slotDurationMins: r.data.slotDurationMins ?? 30, cancellationHours: r.data.cancellationHours ?? 24 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/booking-settings', { ...form, depositPercent: Number(form.depositPercent), slotDurationMins: Number(form.slotDurationMins), cancellationHours: Number(form.cancellationHours) });
      Alert.alert('Saved', 'Booking settings updated.');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>BOOKING SYSTEM</Text>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>{form.isActive ? 'Bookings ACTIVE' : 'Bookings INACTIVE'}</Text>
            <Text style={s.switchSub}>{form.isActive ? 'Customers can book appointments' : 'Booking tab hidden from app'}</Text>
          </View>
          <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ true: '#22c55e', false: T.border }} thumbColor={form.isActive ? '#fff' : T.textFaint} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>BOOKING PARAMETERS</Text>
        {[
          { label: 'DEPOSIT PERCENT (%)', key: 'depositPercent', hint: 'Percentage charged upfront when booking' },
          { label: 'SLOT DURATION (min)', key: 'slotDurationMins', hint: 'Length of each appointment slot' },
          { label: 'CANCELLATION NOTICE (hours)', key: 'cancellationHours', hint: 'Hours before appointment cancellation is free' },
        ].map(f => (
          <View key={f.key} style={{ marginBottom: 14 }}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <Text style={s.fieldHint}>{f.hint}</Text>
            <TextInput
              style={s.input}
              value={String(form[f.key])}
              onChangeText={set(f.key)}
              keyboardType="numeric"
              placeholderTextColor={T.textFaint}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, saving && s.btnDim]} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>SAVE SETTINGS</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function BookingsList({ T, s }) {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [status,   setStatus]   = useState('ALL');
  const [barbers,  setBarbers]  = useState([]);
  const [barberId, setBarberId] = useState('ALL');
  const [acting,   setActing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = [];
      if (status !== 'ALL') params.push(`status=${status}`);
      if (barberId !== 'ALL') params.push(`barberId=${barberId}`);
      const r = await api.get(`/bookings${params.length ? '?' + params.join('&') : ''}`);
      setBookings(r.data.bookings || r.data || []);
    } catch { Alert.alert('Error', 'Could not load bookings.'); }
    finally { setLoading(false); }
  }, [status, barberId]);

  useEffect(() => {
    api.get('/barber-profiles').then(r => setBarbers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (booking, newStatus) => {
    setActing(booking.id);
    try {
      await api.put(`/bookings/${booking.id}/status`, { status: newStatus });
      load();
    } catch { Alert.alert('Error', 'Could not update status.'); }
    finally { setActing(null); }
  };

  const cancel = (booking) => {
    Alert.alert('Cancel Booking', 'Cancel and notify customer?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
        setActing(booking.id);
        try { await api.post(`/bookings/${booking.id}/cancel`); load(); }
        catch { Alert.alert('Error', 'Could not cancel.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
        {STATUSES.map(st => (
          <TouchableOpacity key={st} style={[s.chip, status === st && s.chipActive]} onPress={() => setStatus(st)} activeOpacity={0.7}>
            <Text style={[s.chipText, status === st && s.chipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {barbers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
          <TouchableOpacity style={[s.chip, barberId === 'ALL' && s.chipActive]} onPress={() => setBarberId('ALL')} activeOpacity={0.7}>
            <Text style={[s.chipText, barberId === 'ALL' && s.chipTextActive]}>ALL BARBERS</Text>
          </TouchableOpacity>
          {barbers.map(b => (
            <TouchableOpacity key={b.id} style={[s.chip, barberId === String(b.id) && s.chipActive]} onPress={() => setBarberId(String(b.id))} activeOpacity={0.7}>
              <Text style={[s.chipText, barberId === String(b.id) && s.chipTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => String(b.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>No bookings found.</Text>}
          renderItem={({ item: b }) => {
            const col = STATUS_COLORS[b.status] || T.textDim;
            return (
              <View style={[s.bCard, { borderLeftColor: col }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bName}>{b.user?.name || b.customerName || '—'}</Text>
                    <Text style={s.bService}>{b.service?.name || b.serviceName || '—'}</Text>
                    <Text style={s.bDate}>{fmtDate(b.dateTime || b.startTime)}</Text>
                  </View>
                  <View style={[s.bChip, { backgroundColor: col + '22' }]}>
                    <Text style={[s.bChipText, { color: col }]}>{b.status}</Text>
                  </View>
                </View>
                {actingBool(acting, b.id) ? (
                  <ActivityIndicator size="small" color={T.red} />
                ) : (
                  <View style={s.bActions}>
                    {b.status === 'PENDING' && (
                      <TouchableOpacity style={[s.bBtn, { borderColor: '#22c55e' }]} onPress={() => updateStatus(b, 'CONFIRMED')}>
                        <Text style={[s.bBtnText, { color: '#22c55e' }]}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <TouchableOpacity style={[s.bBtn, { borderColor: '#3b82f6' }]} onPress={() => updateStatus(b, 'COMPLETED')}>
                        <Text style={[s.bBtnText, { color: '#3b82f6' }]}>Complete</Text>
                      </TouchableOpacity>
                    )}
                    {['PENDING','CONFIRMED'].includes(b.status) && (
                      <TouchableOpacity style={[s.bBtn, { borderColor: T.red }]} onPress={() => cancel(b)}>
                        <Text style={[s.bBtnText, { color: T.red }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const actingBool = (acting, id) => acting === id;

function makeStyles(T) { return StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: T.red },
  tabLabel: { fontFamily: T.fontHead, fontSize: 11, letterSpacing: 2, color: T.textDim },
  tabLabelActive: { color: T.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  switchSub: { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, marginTop: 2 },
  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 },
  fieldHint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginBottom: 6 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: T.red, paddingVertical: 14, alignItems: 'center' },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },
  filterBar: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  filterContent: { paddingHorizontal: 12, alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  chipActive: { borderBottomColor: T.red },
  chipText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1.5, color: T.textDim },
  chipTextActive: { color: T.text },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
  bCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, padding: 12, marginBottom: 8 },
  bName: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, marginBottom: 2 },
  bService: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim, marginBottom: 2 },
  bDate: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  bChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  bChipText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1 },
  bActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  bBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  bBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 0.5 },
}); }
