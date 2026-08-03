import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const STATUSES = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REFUNDED'];
const STATUS_COLORS = {
  PENDING: '#f59e0b', PAID: '#22c55e', PROCESSING: '#3b82f6',
  FULFILLED: '#22c55e', CANCELLED: '#ef4444', REFUNDED: '#8b5cf6',
};
const fmtCcy = (n) => `£${Number(n || 0).toFixed(2)}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export default function OrdersSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState('ALL');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded,   setExpanded]   = useState(null);
  const [acting,     setActing]     = useState(null);

  const load = useCallback(async (p = 1, st = status) => {
    setLoading(true);
    try {
      const params = [`page=${p}`, `limit=20`];
      if (st !== 'ALL') params.push(`status=${st}`);
      const r = await api.get(`/orders?${params.join('&')}`);
      setOrders(r.data.orders || []);
      setTotalPages(r.data.totalPages || 1);
      setPage(p);
    } catch { Alert.alert('Error', 'Could not load orders.'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(1, status); }, [status]);

  const updateStatus = async (order, newStatus) => {
    setActing(order.id);
    try {
      await api.put(`/orders/${order.id}/status`, { status: newStatus });
      load(page, status);
      setExpanded(null);
    } catch { Alert.alert('Error', 'Could not update status.'); }
    finally { setActing(null); }
  };

  const refund = (order) => {
    Alert.alert('Refund Order', `Issue refund for order #${order.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refund', style: 'destructive', onPress: async () => {
        setActing(order.id);
        try { await api.post(`/orders/${order.id}/refund`); load(page, status); setExpanded(null); }
        catch { Alert.alert('Error', 'Could not process refund.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
        {STATUSES.map(st => (
          <TouchableOpacity key={st} style={[s.chip, status === st && s.chipActive]} onPress={() => setStatus(st)} activeOpacity={0.7}>
            <Text style={[s.chipText, status === st && s.chipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>No orders found.</Text>}
          renderItem={({ item: o }) => {
            const col = STATUS_COLORS[o.status] || T.textDim;
            const isExp = expanded === o.id;
            return (
              <View style={s.card}>
                <TouchableOpacity onPress={() => setExpanded(isExp ? null : o.id)} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.orderId}>#{o.id}</Text>
                      <Text style={s.orderName}>{o.user?.name || o.customerName || '—'}</Text>
                      <Text style={s.orderDate}>{fmtDate(o.createdAt)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.orderTotal}>{fmtCcy(o.total)}</Text>
                      <View style={[s.statusChip, { backgroundColor: col + '22' }]}>
                        <Text style={[s.statusText, { color: col }]}>{o.status}</Text>
                      </View>
                    </View>
                    <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={14} color={T.textFaint} />
                  </View>
                </TouchableOpacity>

                {isExp && (
                  <View style={s.expanded}>
                    {o.items?.length > 0 && (
                      <View style={{ marginBottom: 10 }}>
                        {o.items.map((item, i) => (
                          <View key={i} style={s.itemRow}>
                            <Text style={s.itemName} numberOfLines={1}>{item.name || item.productName || '—'}</Text>
                            <Text style={s.itemAmt}>×{item.quantity || 1} {fmtCcy(item.price)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {acting === o.id ? (
                      <ActivityIndicator size="small" color={T.red} />
                    ) : (
                      <View style={s.actions}>
                        {o.status === 'PAID' && (
                          <TouchableOpacity style={[s.actionBtn, { borderColor: '#3b82f6' }]} onPress={() => updateStatus(o, 'PROCESSING')}>
                            <Text style={[s.actionText, { color: '#3b82f6' }]}>Mark Processing</Text>
                          </TouchableOpacity>
                        )}
                        {o.status === 'PROCESSING' && (
                          <TouchableOpacity style={[s.actionBtn, { borderColor: '#22c55e' }]} onPress={() => updateStatus(o, 'FULFILLED')}>
                            <Text style={[s.actionText, { color: '#22c55e' }]}>Mark Fulfilled</Text>
                          </TouchableOpacity>
                        )}
                        {['PAID','PROCESSING'].includes(o.status) && (
                          <TouchableOpacity style={[s.actionBtn, { borderColor: '#8b5cf6' }]} onPress={() => refund(o)}>
                            <Text style={[s.actionText, { color: '#8b5cf6' }]}>Refund</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pageRow}>
                <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDim]} onPress={() => load(page - 1, status)} disabled={page === 1}>
                  <Ionicons name="chevron-back" size={14} color={page === 1 ? T.textFaint : T.text} />
                </TouchableOpacity>
                <Text style={s.pageNum}>{page} / {totalPages}</Text>
                <TouchableOpacity style={[s.pageBtn, page >= totalPages && s.pageBtnDim]} onPress={() => load(page + 1, status)} disabled={page >= totalPages}>
                  <Ionicons name="chevron-forward" size={14} color={page >= totalPages ? T.textFaint : T.text} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(T) { return StyleSheet.create({
  filterBar: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  filterContent: { paddingHorizontal: 12, alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  chipActive: { borderBottomColor: T.red },
  chipText: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim },
  chipTextActive: { color: T.text },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  orderId: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 1, color: T.textDim, marginBottom: 2 },
  orderName: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, marginBottom: 2 },
  orderDate: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint },
  orderTotal: { fontFamily: T.fontBodyBd, fontSize: 15, color: T.text },
  statusChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1 },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, flex: 1 },
  itemAmt: { fontFamily: T.fontBodyBd, fontSize: 12, color: T.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 0.5 },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { width: 36, height: 36, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  pageBtnDim: { opacity: 0.3 },
  pageNum: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },
}); }
