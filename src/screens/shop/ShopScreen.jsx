import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, TextInput,
  Dimensions, Animated, Linking, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { BACKEND, WEBSITE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PriceCountUp from '../../components/PriceCountUp';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 36) / 2; // 2 columns, 12px edge + 12px gap

// ── Skeleton loading card ───────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  const { T } = useTheme();
  const sk = useMemo(() => makeSkStyles(T), [T]);
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    return () => anim.stopAnimation();
  }, []);
  return (
    <Animated.View style={[sk.card, { width: CARD_W, opacity: anim }]}>
      <View style={sk.img} />
      <View style={sk.line1} />
      <View style={sk.line2} />
    </Animated.View>
  );
}
function makeSkStyles(T) { return StyleSheet.create({
  card:  { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 12 },
  img:   { width: '100%', height: 140, backgroundColor: T.card },
  line1: { height: 14, backgroundColor: T.card, margin: 10, marginBottom: 6, borderRadius: 3 },
  line2: { height: 10, backgroundColor: T.card, marginHorizontal: 10, marginBottom: 10, borderRadius: 3, width: '60%' },
}); }

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index, cart, onAddToCart, onDecrease, onExpand, isLoggedIn }) {
  const { T } = useTheme();
  const p = useMemo(() => makePStyles(T), [T]);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay: index * 60, useNativeDriver: true }).start();
  }, []);
  const cartEntry = cart.find(i => i.product.id === product.id);
  const qty       = cartEntry?.qty || 0;
  const outOfStock = product.trackStock && product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const lowStock   = product.trackStock && product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const memberOnly = product.priceHidden && !isLoggedIn;

  return (
    <Animated.View style={{ width: CARD_W, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <TouchableOpacity
        style={[p.card, outOfStock && { opacity: 0.55 }]}
        onPress={() => onExpand(product)}
        activeOpacity={0.85}
      >
        {/* Image */}
        <View style={p.imgWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: `${BACKEND}${product.imageUrl}` }} style={p.img} resizeMode="cover" />
          ) : (
            <View style={[p.img, p.imgPlaceholder]}>
              <Ionicons name="image-outline" size={28} color={T.textFaint} />
            </View>
          )}
          {outOfStock && (
            <View style={p.stockBadge}>
              <Text style={p.stockText}>OUT OF STOCK</Text>
            </View>
          )}
          {lowStock && !outOfStock && (
            <View style={[p.stockBadge, { backgroundColor: T.gold + 'cc' }]}>
              <Text style={p.stockText}>ONLY {product.stock} LEFT</Text>
            </View>
          )}
        </View>

        {/* Ghost number stamp (matches website) */}
        <Text style={p.ghostNum}>{String(index + 1).padStart(2, '0')}</Text>

        <View style={p.body}>
          <Text style={p.name} numberOfLines={2}>{product.name}</Text>
          {!!product.description && (
            <Text style={p.desc} numberOfLines={2}>{product.description}</Text>
          )}
          <View style={p.footer}>
            {memberOnly ? (
              <Text style={p.memberOnly}>Members only</Text>
            ) : product.price !== null && product.price !== undefined ? (
              <PriceCountUp price={product.price} style={p.price} />
            ) : null}

            {!outOfStock && !memberOnly && product.category === 'online' && (
              qty > 0 ? (
                <View style={p.stepper}>
                  <TouchableOpacity style={p.stepBtn} onPress={() => onDecrease(product)}>
                    <Text style={p.stepText}>−</Text>
                  </TouchableOpacity>
                  <Text style={p.stepNum}>{qty}</Text>
                  <TouchableOpacity style={p.stepBtn} onPress={() => onAddToCart(product)}>
                    <Text style={p.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={p.addBtn}
                  onPress={(e) => { e.stopPropagation?.(); onAddToCart(product); }}
                  activeOpacity={0.8}
                >
                  <Text style={p.addBtnText}>+</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makePStyles(T) { return StyleSheet.create({
  card:       { backgroundColor: T.surface, borderWidth: 1, borderColor: T.textFaint, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  imgWrap:    { position: 'relative' },
  img:        { width: '100%', height: 148 },
  imgPlaceholder: { backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },
  stockBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(196,30,58,0.85)', paddingVertical: 3, alignItems: 'center' },
  stockText:  { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: '#fff' },
  ghostNum:   { position: 'absolute', top: 152, right: 4, fontFamily: T.fontHead, fontSize: 36, color: T.redDim, lineHeight: 36, zIndex: 0 },
  body:       { padding: 10, paddingTop: 6 },
  name:       { fontFamily: T.fontHead, fontSize: 16, letterSpacing: 1, color: T.text, marginBottom: 2, lineHeight: 18 },
  desc:       { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, lineHeight: 16, marginBottom: 6 },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price:      { fontFamily: T.fontHead, fontSize: 18, color: T.gold, letterSpacing: 1 },
  memberOnly: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 1, color: T.red, borderWidth: 1, borderColor: T.redDim, paddingHorizontal: 6, paddingVertical: 2 },

  addBtn:     { width: 28, height: 28, borderWidth: 1, borderColor: T.red, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: T.fontBodyBd, fontSize: 16, color: T.red, lineHeight: 20 },
  stepper:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.red },
  stepBtn:    { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepText:   { fontFamily: T.fontBodyBd, fontSize: 14, color: T.red, lineHeight: 18 },
  stepNum:    { fontFamily: T.fontBodyMd, fontSize: 12, color: T.text, width: 18, textAlign: 'center' },
}); }

// ── Gift card section ─────────────────────────────────────────────────────────
function GiftCardSection({ denominations, cart, onAddGiftCard, customAmount, setCustomAmount }) {
  const { T } = useTheme();
  const gc = useMemo(() => makeGcStyles(T), [T]);
  return (
    <View>
      <View style={gc.section}>
        <Text style={gc.sectionTitle}>Gift Cards</Text>
        <Text style={gc.sectionSub}>Give the gift of a fresh cut · digital code emailed instantly</Text>
        <View style={gc.rule} />

        {/* Custom amount */}
        <View style={gc.tile}>
          <Ionicons name="create-outline" size={26} color={T.textDim} style={{ marginBottom: 8 }} />
          <Text style={gc.tileValue}>Custom</Text>
          <Text style={gc.tileSub}>Choose your own amount</Text>
          <View style={gc.customRow}>
            <Text style={gc.currencySign}>£</Text>
            <TextInput
              style={gc.customInput}
              value={customAmount}
              onChangeText={t => setCustomAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="Amount"
              placeholderTextColor={T.textDim}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={gc.minHint}>Minimum £15</Text>
          <TouchableOpacity
            style={[gc.addBtn, (!customAmount || parseFloat(customAmount) < 15) && { opacity: 0.35 }]}
            onPress={() => {
              const val = parseFloat(customAmount);
              if (!val || val < 15) return;
              onAddGiftCard({ id: 'custom', value: val });
              setCustomAmount('');
            }}
            disabled={!customAmount || parseFloat(customAmount) < 15}
            activeOpacity={0.8}
          >
            <Text style={gc.addBtnText}>+ ADD TO CART</Text>
          </TouchableOpacity>
        </View>

        {denominations.map((d, i) => {
          const added = cart.some(c => c.product.id === `gc-${d.id}`);
          return (
            <View key={d.id} style={gc.tile}>
                <Ionicons name="gift-outline" size={26} color={T.gold} style={{ marginBottom: 8 }} />
                <PriceCountUp price={d.value} style={gc.tileValue} />
                {!!d.label && <Text style={gc.tileLabel}>{d.label}</Text>}
                <Text style={gc.tileSub}>Digital gift card</Text>
                <TouchableOpacity
                  style={[gc.addBtn, added && gc.addBtnAdded]}
                  onPress={() => onAddGiftCard(d)}
                  activeOpacity={0.8}
                >
                  {added ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark" size={12} color="#2e7d32" />
                      <Text style={[gc.addBtnText, { color: '#2e7d32' }]}>ADDED</Text>
                    </View>
                  ) : (
                    <Text style={gc.addBtnText}>+ ADD TO CART</Text>
                  )}
                </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeGcStyles(T) { return StyleSheet.create({
  section:      { paddingHorizontal: 12, paddingBottom: 24 },
  sectionTitle: { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 3, color: T.text, marginBottom: 4 },
  sectionSub:   { fontFamily: T.fontBody, fontSize: 12, color: T.textDim },
  rule:         { width: 36, height: 2, backgroundColor: T.gold, marginVertical: 14 },
  tile:         { backgroundColor: T.surface, borderWidth: 1, borderColor: T.textFaint, padding: 16, marginBottom: 10, alignItems: 'center' },
  tileValue:    { fontFamily: T.fontHead, fontSize: 32, letterSpacing: 2, color: T.text, marginBottom: 2 },
  tileLabel:    { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: T.textDim, marginBottom: 2 },
  tileSub:      { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 12 },
  customRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: T.textFaint, marginBottom: 12, width: '70%' },
  currencySign: { fontFamily: T.fontHead, fontSize: 20, color: T.text, paddingHorizontal: 10 },
  customInput:  { flex: 1, fontFamily: T.fontHead, fontSize: 20, color: T.text, paddingVertical: 8, paddingRight: 10 },
  minHint:      { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, marginBottom: 8 },
  addBtn:       { borderWidth: 1, borderColor: T.red, paddingVertical: 8, paddingHorizontal: 20 },
  addBtnAdded:  { borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.08)' },
  addBtnText:   { fontFamily: T.fontHead, fontSize: 12, letterSpacing: 2, color: T.red },
}); }

// ── Main screen ─────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const { user } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const isLoggedIn = !!user;

  const scrollRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [products,      setProducts]      = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('online');  // 'online' | 'in-shop'
  const [cart,          setCart]          = useState([]);
  const [customAmount,  setCustomAmount]  = useState('');
  const [lightbox,      setLightbox]      = useState(null);
  const [showCart,      setShowCart]      = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/shop-products/public'),
      api.get('/gift-cards/denominations').catch(() => ({ data: { denominations: [] } })),
    ])
      .then(([prodRes, gcRes]) => {
        setProducts(prodRes.data.products || []);
        setDenominations(gcRes.data.denominations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cart helpers
  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };
  const decreaseCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter(i => i.product.id !== product.id);
      return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty - 1 } : i);
    });
  };
  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const addGiftCardToCart = (denom) => {
    const giftId = `gc-${denom.id}`;
    setCart(prev => {
      const ex = prev.find(i => i.product.id === giftId);
      if (ex) return prev;
      return [...prev, { product: { id: giftId, name: 'Gift Card', price: denom.value, isGiftCard: true }, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const online = products.filter(p => p.category === 'online');
  const inShop = products.filter(p => p.category === 'in-shop');
  const showTabs = online.length > 0 && inShop.length > 0;
  const activeList = showTabs ? (tab === 'online' ? online : inShop) : (online.length > 0 ? online : inShop);
  const isEmpty = products.length === 0 && denominations.length === 0;

  return (
    <SafeAreaView style={s.safe} edges={[]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>LEV3L BARBERS</Text>
          <Text style={s.pageTitle}>The Shop</Text>
          <View style={s.rule} />
        </View>
        {cartCount > 0 && (
          <TouchableOpacity style={s.cartBtn} onPress={() => setShowCart(true)} activeOpacity={0.8}>
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeNum}>{cartCount}</Text>
            </View>
            <Text style={s.cartBtnText}>Cart</Text>
            <Text style={s.cartTotal}>£{cartTotal.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs (only when both categories exist) ── */}
      {!loading && showTabs && (
        <View style={s.tabRow}>
          {[['online', 'Online'], ['in-shop', 'In Shop']].map(([id, label]) => (
            <TouchableOpacity
              key={id}
              style={[s.tabBtn, tab === id && s.tabBtnActive]}
              onPress={() => setTab(id)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, tab === id && s.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>

        {loading ? (
          // Skeleton loading
          <View style={s.grid}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 100} />)}
          </View>

        ) : isEmpty ? (
          // Coming soon state
          <View style={s.coming}>
            <Ionicons name="sparkles-outline" size={40} color={T.red} style={{ opacity: 0.5, marginBottom: 20 }} />
            <Text style={s.comingTitle}>Exciting things coming soon.</Text>
            <Text style={s.comingSub}>
              Our shop is being stocked. Check back soon for exclusive LEV3L products and merch.
            </Text>
          </View>

        ) : (
          <>
            {activeList.length > 0 && (
              <View style={s.grid}>
                {activeList.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    cart={cart}
                    onAddToCart={addToCart}
                    onDecrease={decreaseCart}
                    onExpand={setLightbox}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </View>
            )}

            {denominations.length > 0 && (
              <GiftCardSection
                denominations={denominations}
                cart={cart}
                onAddGiftCard={addGiftCardToCart}
                customAmount={customAmount}
                setCustomAmount={setCustomAmount}
              />
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Product lightbox ── */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <TouchableOpacity style={s.lbBackdrop} activeOpacity={1} onPress={() => setLightbox(null)}>
          {lightbox && (
            <TouchableOpacity style={s.lbInner} activeOpacity={1}>
              {lightbox.imageUrl ? (
                <Image source={{ uri: `${BACKEND}${lightbox.imageUrl}` }} style={s.lbImg} resizeMode="cover" />
              ) : (
                <View style={[s.lbImg, { backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="image-outline" size={48} color={T.textFaint} />
                </View>
              )}
              <View style={s.lbBody}>
                <Text style={s.lbName}>{lightbox.name}</Text>
                {!!lightbox.description && <Text style={s.lbDesc}>{lightbox.description}</Text>}
                {lightbox.price !== null && lightbox.price !== undefined && (
                  lightbox.priceHidden && !isLoggedIn
                    ? <Text style={p.memberOnly}>Members only</Text>
                    : <Text style={s.lbPrice}>£{Number(lightbox.price).toFixed(2)}</Text>
                )}
                {lightbox.category === 'online' && !lightbox.priceHidden && (
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => { addToCart(lightbox); setLightbox(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.primaryBtnText}>ADD TO CART</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={s.lbClose} onPress={() => setLightbox(null)}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>

      {/* ── Cart drawer ── */}
      <Modal visible={showCart} animationType="slide" transparent onRequestClose={() => setShowCart(false)}>
        <Pressable style={s.cartBackdrop} onPress={() => setShowCart(false)}>
          <Pressable onPress={() => {}}>
          <SafeAreaView style={s.cartSheet} edges={['bottom']}>
            <View style={s.cartHead}>
              <Text style={s.cartTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {cart.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ fontFamily: T.fontBodyMd, fontSize: 13, color: T.textDim }}>Your cart is empty.</Text>
                </View>
              ) : (
                cart.map(({ product, qty }) => (
                  <View key={product.id} style={s.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cartItemName}>{product.name}</Text>
                      <Text style={s.cartItemMeta}>£{Number(product.price).toFixed(2)} × {qty}</Text>
                    </View>
                    <Text style={s.cartItemTotal}>£{(product.price * qty).toFixed(2)}</Text>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeFromCart(product.id)}>
                      <Ionicons name="close" size={16} color={T.red} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {cart.length > 0 && (
              <View style={s.cartFooter}>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>TOTAL</Text>
                  <Text style={s.totalAmt}>£{cartTotal.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={() => {
                    setShowCart(false);
                    setCart([]);
                    Linking.openURL(`${WEBSITE_URL}/shop`).catch(() => {});
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.primaryBtnText}>CHECKOUT ON WEBSITE →</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.textFaint },
  eyebrow:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 3 },
  pageTitle: { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 2, color: T.text, lineHeight: 44 },
  rule:      { width: 36, height: 2, backgroundColor: T.red, marginTop: 10 },
  cartBtn:   { backgroundColor: T.surface, borderWidth: 1, borderColor: T.textFaint, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', position: 'relative' },
  cartBadge: { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  cartBadgeNum: { fontFamily: T.fontBodyBd, fontSize: 10, color: '#fff' },
  cartBtnText:  { fontFamily: T.fontBodyBd, fontSize: 12, color: T.text, letterSpacing: 1 },
  cartTotal:    { fontFamily: T.fontBodyBd, fontSize: 11, color: T.gold, marginTop: 2 },

  tabRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.textFaint, backgroundColor: T.surface },
  tabBtn:    { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: T.red },
  tabLabel:  { fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: T.text, opacity: 0.55 },
  tabLabelActive: { color: T.text },

  scroll: { flex: 1 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12 },

  coming:      { alignItems: 'center', justifyContent: 'center', minHeight: '55%', padding: 32 },
  comingTitle: { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 3, color: T.textDim, marginBottom: 10, textAlign: 'center' },
  comingSub:   { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, textAlign: 'center', lineHeight: 21 },

  // Lightbox
  lbBackdrop: { flex: 1, backgroundColor: 'rgba(10,10,10,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  lbInner:    { width: '100%', maxWidth: 400, backgroundColor: T.surface, borderWidth: 1, borderColor: T.textFaint, overflow: 'hidden' },
  lbImg:      { width: '100%', height: 260 },
  lbBody:     { padding: 18 },
  lbName:     { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 },
  lbDesc:     { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, lineHeight: 20, marginBottom: 12 },
  lbPrice:    { fontFamily: T.fontHead, fontSize: 26, color: T.gold, marginBottom: 16 },
  lbClose:    { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },

  // Cart
  cartBackdrop:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartSheet:   { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', borderWidth: 1, borderColor: T.textFaint },
  cartHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: T.textFaint },
  cartTitle:   { fontFamily: T.fontHead, fontSize: 26, letterSpacing: 2, color: T.text },
  cartItem:    { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.textFaint },
  cartItemName:{ fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  cartItemMeta:{ fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginTop: 2 },
  cartItemTotal:{ fontFamily: T.fontHead, fontSize: 16, color: T.gold, marginRight: 12 },
  removeBtn:   { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  cartFooter:  { padding: 20, borderTopWidth: 1, borderTopColor: T.textFaint },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel:  { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 3, color: T.text },
  totalAmt:    { fontFamily: T.fontHead, fontSize: 26, color: T.text },
}); }
