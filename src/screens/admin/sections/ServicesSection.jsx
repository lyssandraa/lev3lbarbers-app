import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
  Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import ServiceFormModal from '../../../components/ServiceFormModal';

const fmtPrice = (p) => p != null ? `£${Number(p).toFixed(2)}` : '—';

// Fixed row height while reordering keeps the drag math exact (no dynamic
// content in this mode — just name + price on one line).
const ROW_HEIGHT = 56;

function DraggableRow({ item, index, total, isDragging, dragY, onDragStart, onDragMoveEnd, T, s }) {
  // PanResponder handlers are created once; read current index/total via
  // refs so they're never stale inside the closures.
  const indexRef = useRef(index);
  indexRef.current = index;
  const totalRef = useRef(total);
  totalRef.current = total;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Without this, the enclosing ScrollView can steal the gesture the
      // moment it detects vertical movement, which is what made dragging
      // feel like it kept slipping out of your hand.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => onDragStart(indexRef.current),
      onPanResponderMove: (_, g) => dragY.setValue(g.dy),
      onPanResponderRelease: (_, g) => onDragMoveEnd(g.dy, indexRef.current, totalRef.current),
      onPanResponderTerminate: (_, g) => onDragMoveEnd(g.dy, indexRef.current, totalRef.current),
    })
  ).current;

  return (
    <Animated.View
      style={[
        s.dragRow,
        isDragging && {
          zIndex: 10, elevation: 6, shadowOpacity: 0.25, shadowRadius: 8,
          transform: [{ translateY: dragY }],
        },
      ]}
    >
      <Text style={s.dragName} numberOfLines={1}>{item.name}</Text>
      <Text style={s.svcPrice}>{fmtPrice(item.price)}</Text>
      <View {...pan.panHandlers} style={s.dragHandle} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Ionicons name="reorder-three" size={24} color={T.textDim} />
      </View>
    </Animated.View>
  );
}

function DraggableGroup({ items, onReorder, onDragActiveChange, T, s }) {
  const [data, setData] = useState(items);
  useEffect(() => { setData(items); }, [items]);

  const [activeIndex, setActiveIndex] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  // Bumped on every new drag so a settle-animation callback from a PREVIOUS
  // drag (interrupted mid-flight because a new one started) can tell it's
  // stale and skip clobbering the new drag's state — see handleDragMoveEnd.
  const dragTokenRef = useRef(0);

  const handleDragStart = (index) => {
    dragTokenRef.current += 1;
    dragY.setValue(0);
    setActiveIndex(index);
    onDragActiveChange?.(true);
  };

  const handleDragMoveEnd = (dy, fromIndex, total) => {
    const token = dragTokenRef.current;
    const to = Math.max(0, Math.min(total - 1, fromIndex + Math.round(dy / ROW_HEIGHT)));
    Animated.timing(dragY, {
      toValue: (to - fromIndex) * ROW_HEIGHT,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Only reset to "idle" if a newer drag hasn't already taken over —
      // otherwise this is a stale callback and resetting now would yank
      // dragY/activeIndex out from under the drag that's actually active.
      if (dragTokenRef.current === token) {
        dragY.setValue(0);
        setActiveIndex(null);
        onDragActiveChange?.(false);
      }
      if (to !== fromIndex) {
        setData(prev => {
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(to, 0, moved);
          onReorder(next);
          return next;
        });
      }
    });
  };

  return (
    <View>
      {data.map((item, i) => (
        <DraggableRow
          key={item.id}
          item={item}
          index={i}
          total={data.length}
          isDragging={activeIndex === i}
          dragY={dragY}
          onDragStart={handleDragStart}
          onDragMoveEnd={handleDragMoveEnd}
          T={T}
          s={s}
        />
      ))}
    </View>
  );
}

export default function ServicesSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragActive,  setDragActive]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/services/all-services');
      setServices(r.data.allServices || []);
    } catch { Alert.alert('Error', 'Could not load services.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setShowForm(true); };
  const openEdit = (svc) => { setEditing(svc); setShowForm(true); };
  const onSaved  = () => { setShowForm(false); load(); };

  const remove = (svc) => {
    Alert.alert('Delete Service', `Remove "${svc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/services/delete-service/${svc.id}`); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const handleReorder = async (newItems) => {
    try {
      await api.put('/services/reorder-services', {
        services: newItems.map((svc, idx) => ({ id: svc.id, order: idx })),
      });
      load();
    } catch {
      Alert.alert('Error', 'Could not save the new order.');
      load();
    }
  };

  const public_svcs = services.filter(s => s.type === 'public');
  const member_svcs = services.filter(s => s.type === 'member');

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} scrollEnabled={!dragActive}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          {!reorderMode && (
            <TouchableOpacity style={[s.addBtn, { flex: 1, marginBottom: 0 }]} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnText}>ADD SERVICE</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.reorderBtn, reorderMode && s.reorderBtnActive, !reorderMode && { flex: 0, paddingHorizontal: 20 }]}
            onPress={() => setReorderMode(v => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name={reorderMode ? 'checkmark' : 'reorder-three-outline'} size={16} color={reorderMode ? '#fff' : T.text} />
            <Text style={[s.reorderBtnText, reorderMode && { color: '#fff' }]}>{reorderMode ? 'DONE' : 'REORDER'}</Text>
          </TouchableOpacity>
        </View>

        {reorderMode && (
          <Text style={s.reorderHint}>Drag the handle to reorder within a group. Order is saved automatically.</Text>
        )}

        {[['PUBLIC SERVICES', public_svcs], ['MEMBER SERVICES', member_svcs]].map(([label, list]) => (
          list.length > 0 && (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={s.groupLabel}>{label}</Text>
              {reorderMode ? (
                <DraggableGroup items={list} onReorder={handleReorder} onDragActiveChange={setDragActive} T={T} s={s} />
              ) : (
                list.map(svc => (
                  <View key={svc.id} style={s.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.svcName}>{svc.name}</Text>
                        {svc.description && <Text style={s.svcDesc} numberOfLines={2}>{svc.description}</Text>}
                      </View>
                      <Text style={s.svcPrice}>{fmtPrice(svc.price)}</Text>
                    </View>
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(svc)}>
                        <Ionicons name="pencil-outline" size={15} color={T.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, { borderColor: T.red }]} onPress={() => remove(svc)}>
                        <Ionicons name="trash-outline" size={15} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ServiceFormModal
        visible={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={onSaved}
      />
    </>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  groupLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  svcName: { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text, marginBottom: 3 },
  svcDesc: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18 },
  svcPrice: { fontFamily: T.fontHead, fontSize: 18, color: T.gold, letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  iconBtn: { width: 34, height: 34, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.red, paddingVertical: 13, marginBottom: 14 },
  addBtnText: { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },

  reorderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: T.border, paddingVertical: 13 },
  reorderBtnActive: { backgroundColor: T.red, borderColor: T.red },
  reorderBtnText: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.text },
  reorderHint: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 10, lineHeight: 17 },

  dragRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: ROW_HEIGHT, paddingHorizontal: 14,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 8,
  },
  dragName: { flex: 1, fontFamily: T.fontBodyBd, fontSize: 14, color: T.text },
  dragHandle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}); }
