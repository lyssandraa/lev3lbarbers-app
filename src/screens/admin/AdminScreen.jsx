import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useShopMode } from '../../context/ShopModeContext';

// Section components
import StampSection         from './sections/StampSection';
import ShopStatusSection    from './sections/ShopStatusSection';
import DashboardSection     from './sections/DashboardSection';
import RewardPoolSection    from './sections/RewardPoolSection';
import ReferralsSection     from './sections/ReferralsSection';
import BirthdaySection      from './sections/BirthdaySection';
import CustomersSection     from './sections/CustomersSection';
import BarbersSection       from './sections/BarbersSection';
import BookingsSection      from './sections/BookingsSection';
import ServicesSection      from './sections/ServicesSection';
import BannersSection       from './sections/BannersSection';
import HeroSlideshowSection from './sections/HeroSlideshowSection';
import NewsletterSection    from './sections/NewsletterSection';
import WhatsOnSection       from './sections/WhatsOnSection';
import OrdersSection        from './sections/OrdersSection';
import GiftCardsSection     from './sections/GiftCardsSection';
import PromosSection        from './sections/PromosSection';
import ShopSettingsSection  from './sections/ShopSettingsSection';
import LoyaltySection       from './sections/LoyaltySection';
import ExpirySection        from './sections/ExpirySection';
import RewardTermsSection   from './sections/RewardTermsSection';
import WeeklyPrizeSection  from './sections/WeeklyPrizeSection';
import LegalDocSection      from './sections/LegalDocSection';
import CreateAccountsSection from './sections/CreateAccountsSection';

/* ── Role helpers ── */
const ROLE_LEVELS = { USER: 1, STAFF: 2, ADMIN: 3, DEVELOPER: 4 };
const canSee = (role, minRole) => (ROLE_LEVELS[role] || 0) >= (ROLE_LEVELS[minRole] || 0);

/* ── Menu definition (mirrors website AdminPanel.jsx) ──
   Regrouped by actual job rather than by role — each group is now one
   clear concept (Content, Shop, Rewards, Settings, Team & Bookings,
   Customers & Communication) instead of a role-based "Operations" bucket
   plus two junk-drawer groups (the old Content and Settings mixed
   several unrelated concerns each). Stamp Manager moved into Rewards —
   stamps are the loyalty mechanic, so it's a tighter fit than standing
   alone, and it still works for STAFF: group and item visibility are
   filtered independently below, so a STAFF user just sees a single
   "Rewards" group containing only Stamp Manager — everything else in it
   stays hidden. */
const MENU = [
  {
    group: 'Overview', minRole: 'ADMIN',
    items: [
      { id: 'dashboard',  label: 'Dashboard',    icon: 'grid-outline',      minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Content', minRole: 'ADMIN',
    items: [
      { id: 'banners',       label: 'Banners',        icon: 'megaphone-outline',   minRole: 'ADMIN' },
      { id: 'heroSlideshow', label: 'Hero Slideshow', icon: 'images-outline',      minRole: 'ADMIN' },
      // Gallery and Shop Products already have full admin add/edit/delete
      // built in as inline controls on their own customer-facing screens
      // (GalleryScreen/ShopScreen, gated on isAdmin) — these two just link
      // out to those screens instead of duplicating that UI here.
      { id: 'gallery',       label: 'Gallery',        icon: 'albums-outline',      minRole: 'ADMIN', route: 'Gallery' },
      { id: 'whatsOn',       label: "What's On",      icon: 'newspaper-outline',   minRole: 'ADMIN' },
      { id: 'services',      label: 'Services',       icon: 'list-outline',        minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Shop', minRole: 'ADMIN',
    items: [
      { id: 'shopProducts',  label: 'Shop Products',  icon: 'pricetags-outline',   minRole: 'ADMIN', route: { screen: 'Shop' } },
      { id: 'orders',        label: 'Orders',         icon: 'bag-outline',         minRole: 'ADMIN' },
      { id: 'giftCards',     label: 'Gift Cards',     icon: 'card-outline',        minRole: 'ADMIN' },
      { id: 'promos',        label: 'Promo Codes',    icon: 'pricetag-outline',    minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Rewards', minRole: 'STAFF',
    items: [
      { id: 'stamps',       label: 'Stamp Manager',    icon: 'qr-code-outline',        minRole: 'STAFF' },
      { id: 'rewardPool',   label: 'Reward Pool',      icon: 'gift-outline',           minRole: 'ADMIN' },
      { id: 'referrals',    label: 'Referral System',  icon: 'people-outline',         minRole: 'ADMIN' },
      { id: 'birthday',     label: 'Birthday Rewards', icon: 'ribbon-outline',         minRole: 'ADMIN' },
      { id: 'weeklyPrize',  label: 'Weekly Game Prize',icon: 'game-controller-outline',minRole: 'ADMIN' },
      { id: 'expiry',       label: 'Reward Expiry',    icon: 'time-outline',           minRole: 'ADMIN' },
      { id: 'rewardTerms',  label: 'Reward T&C',       icon: 'document-text-outline',  minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Settings', minRole: 'ADMIN',
    items: [
      // Shop Status is an app-only convenience quick-toggle (the website
      // never had a separate one, only the full Shop Settings form).
      { id: 'shopStatus',   label: 'Shop Status',   icon: 'storefront-outline', minRole: 'ADMIN' },
      { id: 'shopSettings', label: 'Shop Settings', icon: 'settings-outline',   minRole: 'ADMIN' },
      { id: 'loyalty',      label: 'Loyalty Settings',  icon: 'star-outline',            minRole: 'ADMIN' },
      { id: 'terms',        label: 'Terms & Conditions', icon: 'document-outline',       minRole: 'ADMIN' },
      { id: 'privacy',      label: 'Privacy Notice',    icon: 'lock-closed-outline',     minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Team & Bookings', minRole: 'ADMIN',
    items: [
      { id: 'createStaff',  label: 'Create Staff',           icon: 'person-add-outline', minRole: 'ADMIN' },
      { id: 'createAdmin',  label: 'Create Admin',           icon: 'key-outline',        minRole: 'DEVELOPER' },
      { id: 'bookings',     label: 'Booking System',         icon: 'calendar-outline',   minRole: 'ADMIN' },
      { id: 'barbers',      label: 'Barbers & Availability', icon: 'cut-outline',        minRole: 'ADMIN' },
    ],
  },
  {
    group: 'Customers & Communication', minRole: 'ADMIN',
    items: [
      { id: 'customers',  label: 'Customer Accounts', icon: 'person-outline',    minRole: 'ADMIN' },
      { id: 'newsletter', label: 'Newsletter',        icon: 'mail-outline',      minRole: 'ADMIN' },
    ],
  },
];

/* ── Section labels (for header when navigated in) ── */
const SECTION_LABELS = {};
MENU.forEach(g => g.items.forEach(i => { SECTION_LABELS[i.id] = i.label; }));

/* ── Render the active section component ── */
function renderSection(sectionId) {
  switch (sectionId) {
    case 'stamps':      return <StampSection />;
    case 'shopStatus':  return <ShopStatusSection />;
    case 'dashboard':   return <DashboardSection />;
    case 'rewardPool':  return <RewardPoolSection />;
    case 'referrals':   return <ReferralsSection />;
    case 'birthday':    return <BirthdaySection />;
    case 'customers':   return <CustomersSection />;
    case 'newsletter':  return <NewsletterSection />;
    case 'barbers':     return <BarbersSection />;
    case 'bookings':    return <BookingsSection />;
    case 'services':    return <ServicesSection />;
    case 'banners':     return <BannersSection />;
    case 'heroSlideshow': return <HeroSlideshowSection />;
    case 'whatsOn':     return <WhatsOnSection />;
    case 'orders':      return <OrdersSection />;
    case 'giftCards':   return <GiftCardsSection />;
    case 'promos':      return <PromosSection />;
    case 'shopSettings':return <ShopSettingsSection />;
    case 'loyalty':     return <LoyaltySection />;
    case 'expiry':      return <ExpirySection />;
    case 'rewardTerms':  return <RewardTermsSection />;
    case 'weeklyPrize':  return <WeeklyPrizeSection />;
    case 'terms':       return <LegalDocSection endpoint="/general-terms"  dataKey="terms"   title="Terms & Conditions" />;
    case 'privacy':     return <LegalDocSection endpoint="/privacy-notice" dataKey="notice"  title="Privacy Notice" />;
    case 'createStaff': return <CreateAccountsSection mode="staff" />;
    case 'createAdmin': return <CreateAccountsSection mode="admin" />;
    default:            return null;
  }
}

/* ── Main screen ── */
export default function AdminScreen({ navigation }) {
  const { user, isShopUser, isAdmin } = useAuth();
  const { shopMode, setShopMode } = useShopMode();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const insets = useSafeAreaInsets();
  const role = user?.role || 'USER';
  const [activeSection, setActiveSection] = useState(null);
  // Matches the website: ADMIN lands on Overview (Dashboard) open by
  // default; STAFF — who can only see Stamp Manager inside Rewards —
  // land there instead, since Overview is hidden from them entirely.
  const [openGroups,    setOpenGroups]    = useState({ [isAdmin ? 'Overview' : 'Rewards']: true });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ [group]: !prev[group] }));
  };

  const navigate = (item) => {
    if (typeof item.route === 'string') { navigation.navigate(item.route); return; }
    if (item.route) { navigation.navigate('MainApp', item.route); return; }
    setActiveSection(item.id);
  };
  const goBack   = ()  => { setActiveSection(null); };

  /* Access denied */
  if (!isShopUser) {
    return (
      <SafeAreaView style={s.safe} edges={[]}>
        <View style={s.denied}>
          <Ionicons name="lock-closed-outline" size={40} color={T.textDim} style={{ marginBottom: 12 }} />
          <Text style={s.deniedTitle}>ACCESS DENIED</Text>
          <Text style={s.deniedSub}>Admin area is restricted to staff.</Text>
          {navigation.canGoBack() && (
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={s.backBtnText}>← BACK</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  /* Section view */
  if (activeSection) {
    return (
      <SafeAreaView style={s.safe} edges={[]}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color={T.textDim} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEye}>ADMIN</Text>
            <Text style={s.headerTitle}>{SECTION_LABELS[activeSection] || activeSection}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          {renderSection(activeSection)}
        </View>
      </SafeAreaView>
    );
  }

  /* Menu view */
  const visibleGroups = MENU.filter(g => canSee(role, g.minRole));

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <View style={s.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={T.textDim} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerEye}>ADMIN</Text>
          <Text style={s.headerTitle}>Staff Panel</Text>
        </View>
        <View style={[s.roleBadge, role === 'DEVELOPER' ? s.roleDev : role === 'ADMIN' ? s.roleAdmin : s.roleStaff]}>
          <Text style={s.roleText}>{role}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={[s.menuContent, { paddingBottom: insets.bottom + 32 }]}>
        {isAdmin && (
          <View style={s.shopModeCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.shopModeTitle}>SHOP MODE</Text>
              <Text style={s.shopModeSub}>
                Makes this device a shop kiosk — when nobody's logged in, it opens
                straight to the "who's working" barber picker instead of the app.
              </Text>
            </View>
            <Switch
              value={shopMode}
              onValueChange={setShopMode}
              trackColor={{ true: T.red, false: T.border }}
              thumbColor="#fff"
            />
          </View>
        )}

        {visibleGroups.map(group => {
          const isOpen = !!openGroups[group.group];
          const visibleItems = group.items.filter(item => canSee(role, item.minRole));
          if (visibleItems.length === 0) return null;
          return (
            <View key={group.group} style={s.groupWrap}>
              {/* Group header (accordion toggle) */}
              <TouchableOpacity style={s.groupHeader} onPress={() => toggleGroup(group.group)} activeOpacity={0.7}>
                <Text style={s.groupLabel}>{group.group.toUpperCase()}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={T.textFaint} />
              </TouchableOpacity>

              {/* Group items */}
              {isOpen && visibleItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.menuItem, idx < visibleItems.length - 1 && s.menuItemBorder]}
                  onPress={() => navigate(item)}
                  activeOpacity={0.7}
                >
                  <View style={s.menuIconWrap}>
                    <Ionicons name={item.icon} size={16} color={T.red} />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={13} color={T.textFaint} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border, gap: 12 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerEye: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red },
  headerTitle: { fontFamily: T.fontHead, fontSize: 24, letterSpacing: 1, color: T.text, lineHeight: 26 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3 },
  roleStaff: { backgroundColor: T.border },
  roleAdmin: { backgroundColor: T.redDim, borderWidth: 1, borderColor: T.red },
  roleDev:   { backgroundColor: T.goldDim, borderWidth: 1, borderColor: T.gold },
  roleText: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.text },

  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  deniedTitle: { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 3, color: T.text, marginBottom: 8 },
  deniedSub: { fontFamily: T.fontBodyMd, fontSize: 14, color: T.textDim, marginBottom: 24 },
  backBtn: { borderWidth: 1, borderColor: T.border, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: T.textDim },

  scroll: { flex: 1 },
  menuContent: { padding: 16 },

  shopModeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: T.red + '55', backgroundColor: T.redDim,
    padding: 16, marginBottom: 14,
  },
  shopModeTitle: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 2, color: T.text, marginBottom: 4 },
  shopModeSub: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 17 },

  groupWrap: { marginBottom: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: T.card },
  groupLabel: { fontFamily: T.fontBodyBd, fontSize: 12, letterSpacing: 3, color: T.text },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  menuIconWrap: { width: 30, height: 30, borderRadius: 6, backgroundColor: T.redDim, borderWidth: 1, borderColor: T.red + '44', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: T.fontBodyBd, fontSize: 15, color: T.text },
}); }
