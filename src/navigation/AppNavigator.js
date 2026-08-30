import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, AppState } from 'react-native';
import { NavigationContainer, useNavigation, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useShopMode } from '../context/ShopModeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/api';
import BarberPole from '../components/BarberPole';
import ShopStatusFormModal from '../components/ShopStatusFormModal';
import usePushNotifications from '../hooks/usePushNotifications';

// Auth screens
import LoginScreen          from '../screens/auth/LoginScreen';
import SignupScreen         from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen  from '../screens/auth/ResetPasswordScreen';
import StaffSwitchScreen    from '../screens/auth/StaffSwitchScreen';

// App screens
import HomeScreen     from '../screens/home/HomeScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import ShopScreen     from '../screens/shop/ShopScreen';
import ServicesScreen from '../screens/services/ServicesScreen';
import ContactScreen  from '../screens/contact/ContactScreen';
import GalleryScreen  from '../screens/gallery/GalleryScreen';
import WhatsOnScreen  from '../screens/whats-on/WhatsOnScreen';
import LoyaltyScreen  from '../screens/loyalty/LoyaltyScreen';
import ProfileScreen  from '../screens/profile/ProfileScreen';
import AdminScreen    from '../screens/admin/AdminScreen';
import PlayScreen     from '../screens/play/PlayScreen';
import ScanScreen     from '../screens/scan/ScanScreen';

import AppBanner           from '../components/AppBanner';
import WinnerModal         from '../components/WinnerModal';
import IncomingInviteModal from '../components/IncomingInviteModal';
import PongInviteScreen    from '../screens/play/PongInviteScreen';
import PongGameScreen      from '../screens/play/PongGameScreen';

const RootStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();

const TAB_ICONS = {
  Home:     { focused: 'home',             outline: 'home-outline' },
  Bookings: { focused: 'calendar',         outline: 'calendar-outline' },
  Shop:     { focused: 'bag-handle',       outline: 'bag-handle-outline' },
  Services: { focused: 'cut',              outline: 'cut-outline' },
  Contact:  { focused: 'location',         outline: 'location-outline' },
  Scan:     { focused: 'qr-code',          outline: 'qr-code-outline' },
  Play:     { focused: 'game-controller',  outline: 'game-controller-outline' },
  SwitchBarber: { focused: 'swap-horizontal', outline: 'swap-horizontal-outline' },
  Settings: { focused: 'settings',         outline: 'settings-outline' },
  Profile:  { focused: 'person',           outline: 'person-outline' },
};

function computeOpenFromStatus(data) {
  if (data.override) return data.isOpen ?? false;
  const hours = data.openingHours || {};
  const now   = new Date();
  const dh    = hours[now.getDay()];
  if (!dh || dh.closed) return false;
  const [oh, om] = (dh.open  || '00:00').split(':').map(Number);
  const [ch, cm] = (dh.close || '00:00').split(':').map(Number);
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

function AppHeader({ isOpen, refreshShopStatus }) {
  const navigation           = useNavigation();
  const { T, isDark, toggleTheme } = useTheme();
  const { isShopUser } = useAuth();
  const h = useMemo(() => makeHStyles(T), [T]);
  const [showStatusEdit, setShowStatusEdit] = useState(false);

  return (
    <View style={h.header}>
      <View style={h.left}>
        <Pressable
          style={h.poleWrap}
          onPress={() => navigation.navigate('MainApp', { screen: 'Contact' })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BarberPole isOpen={isOpen} />
          <Text style={[h.status, { color: isOpen ? '#4caf50' : '#882222' }]}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </Pressable>

        {isShopUser && (
          <TouchableOpacity
            style={h.statusEditBtn}
            onPress={() => setShowStatusEdit(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Edit shop status"
          >
            <Ionicons name="create-outline" size={11} color={T.red} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={h.brandWrap}
        onPress={() => navigation.navigate('MainApp', { screen: 'Home' })}
        activeOpacity={0.7}
      >
        <Text style={h.brand}>
          LEV<Text style={{ color: T.red }}>3</Text>L BARBERS
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={h.right} onPress={toggleTheme} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={20}
          color={T.text}
        />
      </TouchableOpacity>

      {isShopUser && (
        <ShopStatusFormModal
          visible={showStatusEdit}
          onClose={() => setShowStatusEdit(false)}
          onSaved={() => { setShowStatusEdit(false); refreshShopStatus?.(); }}
        />
      )}
    </View>
  );
}

function makeHStyles(T) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      backgroundColor: T.bg,
    },
    left:   { flexDirection: 'column', alignItems: 'center', gap: 4, width: 44 },
    // Pressable has no alignItems of its own, which defaults to RN's
    // 'stretch' — a fixed-width child (the pole) then sits at the stretch
    // axis's start (left) instead of centered, and the Text stretches to
    // fill the full width with its default left-aligned content. That's
    // why the pole and "CLOSED"/"OPEN" label didn't share a center line.
    poleWrap: { alignItems: 'center' },
    status: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 1, textAlign: 'center' },
    statusEditBtn: {
      width: 18, height: 18, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: T.redDim, borderWidth: 1, borderColor: T.red,
    },
    brandWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    brand:  { fontFamily: T.fontHead, fontSize: 31, letterSpacing: 0.5, color: T.text },
    right:  { width: 44, alignItems: 'flex-end', justifyContent: 'center' },
  });
}

function MainTabs() {
  const { T, isDark } = useTheme();
  const { user, isShopUser, isAdmin, logout } = useAuth();
  const isStaffOnly = isShopUser && !isAdmin;

  // Switch Barber must actually log the current person out the moment it's
  // tapped — not just show the picker while the old session stays active
  // underneath, which let anyone flip to another tab and still be signed
  // in as the previous barber. Intercepting tabPress (instead of relying
  // on the tab's own screen) also sidesteps this tab disappearing mid-flow:
  // once `user` is null the STAFF/ADMIN tab set recomputes and this tab
  // may no longer exist, so the actual picker lives on the stable
  // root-level "StaffSwitch" screen instead.
  const switchBarberListeners = ({ navigation }) => ({
    tabPress: (e) => {
      e.preventDefault();
      logout().then(() => {
        navigation.getParent()?.navigate('StaffSwitch');
      });
    },
  });
  usePushNotifications(user);
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [bookingsActive, setBookingsActive] = useState(true);
  const [isOpen,         setIsOpen]         = useState(false);

  useEffect(() => {
    api.get('/booking-settings')
      .then(r => setBookingsActive(r.data.isActive !== false))
      .catch(() => {});
  }, []);

  const fetchStatus = useCallback(() => {
    return api.get('/shop-status')
      .then(r => setIsOpen(computeOpenFromStatus(r.data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 30_000);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchStatus();
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [fetchStatus]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <WinnerModal />
      <IncomingInviteModal />
      <AppBanner />
      <AppHeader isOpen={isOpen} refreshShopStatus={fetchStatus} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: T.bg,
            borderTopColor: T.textFaint,
            paddingBottom: Math.max(bottomInset, 8),
            paddingTop: 4,
            height: 60 + Math.max(bottomInset - 8, 0),
          },
          tabBarActiveTintColor:   T.red,
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(26,26,26,0.62)',
          tabBarLabelStyle: { fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 0.5 },
          tabBarIcon: ({ focused, color }) => {
            const icons = TAB_ICONS[route.name];
            const name  = icons ? (focused ? icons.focused : icons.outline) : 'ellipse';
            return <Ionicons name={name} size={24} color={color} />;
          },
        })}
      >
        {isStaffOnly ? (
          <>
            <Tab.Screen name="Home"     component={HomeScreen}     />
            <Tab.Screen
              name="Scan"
              component={ScanScreen}
              options={{ tabBarLabel: 'Scan' }}
            />
            <Tab.Screen name="Services" component={ServicesScreen} />
            <Tab.Screen
              name="SwitchBarber"
              component={StaffSwitchScreen}
              options={{ tabBarLabel: 'Switch' }}
              listeners={switchBarberListeners}
            />
            <Tab.Screen name="Profile" component={ProfileScreen}  />
          </>
        ) : (
          <>
            <Tab.Screen name="Home"     component={HomeScreen}     />
            {bookingsActive && (
              <Tab.Screen name="Bookings" component={BookingsScreen} />
            )}
            <Tab.Screen name="Services" component={ServicesScreen} />
            <Tab.Screen name="Shop"     component={ShopScreen}     />
            {(!user || user.role === 'USER') && (
              <Tab.Screen
                name="Scan"
                component={LoyaltyScreen}
                options={{ tabBarLabel: 'Scan' }}
              />
            )}
            {isAdmin && (
              <Tab.Screen
                name="Scan"
                component={ScanScreen}
                options={{ tabBarLabel: 'Scan' }}
              />
            )}
            <Tab.Screen name="Play"     component={PlayScreen}     />
            <Tab.Screen name="Contact"  component={ContactScreen}  />
            {isAdmin && (
              <Tab.Screen
                name="SwitchBarber"
                component={StaffSwitchScreen}
                options={{ tabBarLabel: 'Switch' }}
                listeners={switchBarberListeners}
              />
            )}
            {isAdmin && (
              <Tab.Screen
                name="Settings"
                component={AdminScreen}
                options={{ tabBarLabel: 'Settings' }}
              />
            )}
            <Tab.Screen name="Profile"  component={ProfileScreen}  />
          </>
        )}
      </Tab.Navigator>
    </View>
  );
}

const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { shopMode, ready: shopModeReady } = useShopMode();

  // Shop Mode: when nobody's logged in on this device, the barber picker is
  // the landing screen instead of the customer app. `initialRouteName`
  // only applies at first mount, so react to `showKiosk` changing later
  // (e.g. staff logs out) by imperatively resetting the stack. Waiting on
  // authLoading too matters: without it, `user` reads as null (not yet
  // restored from AsyncStorage) on every cold launch, so a device with a
  // valid cached session would briefly flash the kiosk screen before this
  // effect corrected it a moment later.
  const showKiosk = shopMode && !user;
  const prevShowKiosk = useRef(null);
  const ready = shopModeReady && !authLoading;

  useEffect(() => {
    if (!ready) return;
    if (prevShowKiosk.current === null) {
      prevShowKiosk.current = showKiosk;
      return;
    }
    if (showKiosk !== prevShowKiosk.current) {
      prevShowKiosk.current = showKiosk;
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: showKiosk ? 'StaffSwitch' : 'MainApp' }],
        });
      }
    }
  }, [showKiosk, ready]);

  if (!ready) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={showKiosk ? 'StaffSwitch' : 'MainApp'}
      >
        <RootStack.Screen name="MainApp"        component={MainTabs}            />
        <RootStack.Screen name="Login"          component={LoginScreen}         />
        <RootStack.Screen name="Signup"         component={SignupScreen}        />
        <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
        <RootStack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
        <RootStack.Screen name="StaffSwitch"    component={StaffSwitchScreen}   />
        <RootStack.Screen name="Gallery"        component={GalleryScreen}       />
        <RootStack.Screen name="WhatsOn"        component={WhatsOnScreen}       />
        <RootStack.Screen name="Admin"          component={AdminScreen}         />
        <RootStack.Screen name="PongInvite"     component={PongInviteScreen}    />
        <RootStack.Screen name="PongGame"       component={PongGameScreen}      options={{ gestureEnabled: false }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
