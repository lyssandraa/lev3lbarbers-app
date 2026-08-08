import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const fmtCcy = (n) => `£${Number(n || 0).toFixed(2)}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

const STATUS_COLORS = {
  PENDING: '#f59e0b', PAID: '#22c55e', PROCESSING: '#3b82f6',
  FULFILLED: '#22c55e', CANCELLED: '#ef4444', REFUNDED: '#8b5cf6',
};

function StatCard({ icon, label, value, sub, color }) {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={[s.stat, { borderTopColor: color || T.red }]}>
      <Ionicons name={icon} size={18} color={color || T.red} style={{ marginBottom: 8 }} />
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {!!sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

export default function DashboardSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin-dashboard');
      setData(r.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;
  if (!data) return (
    <View style={s.empty}>
      <Text style={s.emptyText}>Could not load dashboard data.</Text>
      <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.7}>
        <Text style={s.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.section}>REVENUE</Text>
      <View style={s.grid}>
        <StatCard icon="cash-outline"    label="All Time"   value={fmtCcy(data.revenue?.allTime)} color={T.gold} />
        <StatCard icon="today-outline"   label="Today"      value={fmtCcy(data.revenue?.today)}   color={T.gold} />
        <StatCard icon="calendar-outline" label="This Week"  value={fmtCcy(data.revenue?.week)}   color={T.gold} />
      </View>

      <Text style={s.section}>ORDERS</Text>
      <View style={s.grid}>
        <StatCard icon="bag-check-outline" label="Paid Orders"    value={data.orders?.paid ?? 0}    color="#22c55e" />
        <StatCard icon="time-outline"      label="Pending Orders" value={data.orders?.pending ?? 0} color="#f59e0b" />
      </View>

      <Text style={s.section}>OVERVIEW</Text>
      <View style={s.grid}>
        <StatCard icon="people-outline"    label="Members"        value={data.members?.total ?? 0}    sub={`+${data.members?.newWeek ?? 0} this week`} />
        <StatCard icon="gift-outline"      label="Unclaimed"      value={data.rewards?.unclaimed ?? 0} color={T.red} />
        <StatCard icon="card-outline"      label="Gift Card Bal"  value={fmtCcy(data.giftCards?.totalBalance)} />
        <StatCard icon="pricetag-outline"  label="Active Promos"  value={data.promos?.active ?? 0}   color="#8b5cf6" />
      </View>

      {data.staffScans?.length > 0 && (
        <>
          <Text style={s.section}>STAFF SCANS</Text>
          <View style={s.card}>
            {data.staffScans.map((row, i) => (
              <View key={row.staffId} style={[s.orderRow, i < data.staffScans.length - 1 && s.orderBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orderName}>{row.name}</Text>
                  <Text style={s.orderDate}>{row.allTime} scan{row.allTime === 1 ? '' : 's'} all time</Text>
                </View>
                <View style={s.orderRight}>
                  <Text style={s.orderAmt}>{row.week}</Text>
                  <Text style={s.orderDate}>this week</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {data.recentOrders?.length > 0 && (
        <>
          <Text style={s.section}>RECENT ORDERS</Text>
          <View style={s.card}>
            {data.recentOrders.map((order, i) => (
              <View key={order.id} style={[s.orderRow, i < data.recentOrders.length - 1 && s.orderBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orderName}>{order.customerName || order.user?.name || '—'}</Text>
                  <Text style={s.orderDate}>{fmtDate(order.createdAt)}</Text>
                </View>
                <View style={s.orderRight}>
                  <Text style={s.orderAmt}>{fmtCcy(order.total)}</Text>
                  <View style={[s.statusChip, { backgroundColor: (STATUS_COLORS[order.status] || T.textDim) + '22' }]}>
                    <Text style={[s.statusText, { color: STATUS_COLORS[order.status] || T.textDim }]}>{order.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  section: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: { flex: 1, minWidth: '45%', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 14, alignItems: 'center' },
  statVal: { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 1, color: T.text, lineHeight: 30, marginBottom: 4 },
  statLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', textAlign: 'center' },
  statSub: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginTop: 3 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  orderRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  orderName: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, marginBottom: 2 },
  orderDate: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmt: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text },
  statusChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, marginBottom: 16, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderColor: T.border, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 1, color: T.textDim },
}); }
