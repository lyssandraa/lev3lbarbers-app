import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const TIER_COLORS = { BRONZE: '#d4a853', SILVER: '#8a93a3', GOLD: '#caa400', PLATINUM: '#7d8aa8' };

export default function CustomersSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected,   setSelected]   = useState(null);
  const [acting,     setActing]     = useState(false);

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/users?page=${p}&search=${encodeURIComponent(q)}`);
      setUsers(r.data.users || []);
      setTotalPages(r.data.totalPages || 1);
      setPage(p);
    } catch { Alert.alert('Error', 'Could not load customers.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1, ''); }, []);

  const doSearch = () => { load(1, search); };

  const suspend = async (user) => {
    const next = !user.suspended;
    Alert.alert(
      next ? 'Suspend Account' : 'Reinstate Account',
      `${next ? 'Suspend' : 'Reinstate'} ${user.name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Suspend' : 'Reinstate',
          style: next ? 'destructive' : 'default',
          onPress: async () => {
            setActing(true);
            try {
              await api.put(`/admin/users/${user.id}/suspend`, { suspended: next });
              setSelected(null);
              load(page, search);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed.');
            } finally { setActing(false); }
          },
        },
      ]
    );
  };

  const deleteUser = async (user) => {
    Alert.alert(
      'Delete Account',
      `Permanently delete ${user.name || user.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              await api.delete(`/admin/users/${user.id}`);
              setSelected(null);
              load(page, search);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed.');
            } finally { setActing(false); }
          },
        },
      ]
    );
  };

  const tierColor = selected ? (TIER_COLORS[selected.tier] || TIER_COLORS.BRONZE) : T.red;

  return (
    <View style={s.wrap}>
      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.textDim} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={T.textFaint}
          returnKeyType="search"
          onSubmitEditing={doSearch}
          autoCapitalize="none"
        />
        {!!search && (
          <TouchableOpacity onPress={() => { setSearch(''); load(1, ''); }}>
            <Ionicons name="close-circle" size={16} color={T.textDim} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.searchBtn} onPress={doSearch} activeOpacity={0.7}>
          <Text style={s.searchBtnText}>GO</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No customers found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => setSelected(item)} activeOpacity={0.7}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(item.name || item.email || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{item.name || '—'}</Text>
                <Text style={s.userEmail}>{item.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[s.tierChip, { backgroundColor: (TIER_COLORS[item.tier] || TIER_COLORS.BRONZE) + '33' }]}>
                  <Text style={[s.tierText, { color: TIER_COLORS[item.tier] || TIER_COLORS.BRONZE }]}>{item.tier || 'BRONZE'}</Text>
                </View>
                {item.suspended && (
                  <View style={s.suspendChip}><Text style={s.suspendText}>SUSPENDED</Text></View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={14} color={T.textFaint} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pageRow}>
                <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDim]} onPress={() => load(page - 1)} disabled={page === 1}>
                  <Ionicons name="chevron-back" size={16} color={page === 1 ? T.textFaint : T.text} />
                </TouchableOpacity>
                <Text style={s.pageNum}>{page} / {totalPages}</Text>
                <TouchableOpacity style={[s.pageBtn, page >= totalPages && s.pageBtnDim]} onPress={() => load(page + 1)} disabled={page >= totalPages}>
                  <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? T.textFaint : T.text} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Customer detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={18} color={T.text} />
            </TouchableOpacity>
            {selected && (
              <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={[s.avatar, s.avatarLg]}>
                    <Text style={[s.avatarText, { fontSize: 22 }]}>{(selected.name || selected.email || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailName}>{selected.name || '—'}</Text>
                    <Text style={s.detailEmail}>{selected.email}</Text>
                    <View style={[s.tierChip, { alignSelf: 'flex-start', marginTop: 4, backgroundColor: tierColor + '33' }]}>
                      <Text style={[s.tierText, { color: tierColor }]}>{selected.tier || 'BRONZE'}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.detailGrid}>
                  <View style={s.detailItem}><Text style={s.detailKey}>Role</Text><Text style={s.detailVal}>{selected.role}</Text></View>
                  <View style={s.detailItem}><Text style={s.detailKey}>Joined</Text><Text style={s.detailVal}>{fmtDate(selected.createdAt)}</Text></View>
                  <View style={s.detailItem}><Text style={s.detailKey}>Stamps (cycle)</Text><Text style={s.detailVal}>{selected.stampsInCycle ?? 0}</Text></View>
                  <View style={s.detailItem}><Text style={s.detailKey}>Cycles done</Text><Text style={s.detailVal}>{selected.stampCycle ?? 0}</Text></View>
                  <View style={s.detailItem}><Text style={s.detailKey}>Referrals</Text><Text style={s.detailVal}>{selected.referralCount ?? 0}</Text></View>
                  <View style={s.detailItem}><Text style={s.detailKey}>Status</Text><Text style={[s.detailVal, { color: selected.suspended ? T.red : '#22c55e' }]}>{selected.suspended ? 'SUSPENDED' : 'ACTIVE'}</Text></View>
                </View>

                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, { borderColor: selected.suspended ? '#22c55e' : T.gold }]}
                    onPress={() => suspend(selected)}
                    disabled={acting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={selected.suspended ? 'lock-open-outline' : 'ban-outline'} size={15} color={selected.suspended ? '#22c55e' : T.gold} />
                    <Text style={[s.actionText, { color: selected.suspended ? '#22c55e' : T.gold }]}>
                      {selected.suspended ? 'Reinstate Account' : 'Suspend Account'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { borderColor: T.red }]}
                    onPress={() => deleteUser(selected)}
                    disabled={acting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color={T.red} />
                    <Text style={[s.actionText, { color: T.red }]}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(T) { return StyleSheet.create({
  wrap: { flex: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  searchInput: { flex: 1, fontFamily: T.fontBody, fontSize: 14, color: T.text },
  searchBtn: { backgroundColor: T.red, paddingHorizontal: 12, paddingVertical: 6 },
  searchBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 1, color: '#fff' },
  list: { padding: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontFamily: T.fontHead, fontSize: 16, color: '#fff' },
  userName: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, marginBottom: 2 },
  userEmail: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim },
  tierChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tierText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1 },
  suspendChip: { backgroundColor: T.redDim, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  suspendText: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 1, color: T.red },
  empty: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 40 },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { width: 36, height: 36, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  pageBtnDim: { opacity: 0.3 },
  pageNum: { fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderTopWidth: 1, borderColor: T.border, paddingTop: 8 },
  handle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  closeBtn: { position: 'absolute', right: 16, top: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 40 },
  detailName: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 1, color: T.text, lineHeight: 24 },
  detailEmail: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailItem: { width: '47%', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 12 },
  detailKey: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 },
  detailVal: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  actions: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderWidth: 1 },
  actionText: { fontFamily: T.fontBodyBd, fontSize: 13, letterSpacing: 0.5 },
}); }
