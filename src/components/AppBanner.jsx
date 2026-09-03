import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const W = Dimensions.get('window').width;
const DURATION = 12000; // match website exactly

// Website route slug -> app screen. Tab screens go through 'MainApp' since
// they're nested inside the tab navigator; the rest are direct RootStack
// screens. Unrecognized/blank page values are just not tappable. Covers
// every website route that has an app equivalent, plus a couple of aliases
// ('signup'/'register', 'rewards'/'loyalty') since admins may type either.
const PAGE_TABS  = {
  shop: 'Shop', services: 'Services', contact: 'Contact', bookings: 'Bookings',
  profile: 'Profile', home: 'Home',
  rewards: 'Scan', loyalty: 'Scan',
};
const PAGE_STACK = {
  gallery: 'Gallery', 'whats-on': 'WhatsOn',
  signup: 'Signup', register: 'Signup', login: 'Login',
};

export default function AppBanner() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [idx,      setIdx]      = useState(0);
  const x        = useRef(new Animated.Value(-W)).current;
  const animRef  = useRef(null);

  useEffect(() => {
    api.get('/banners/public')
      .then(r => setMessages(r.data.data || []))
      .catch(() => {});
  }, []);

  // Cycle messages every 12 s — matches website's setInterval(duration * 1000)
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % messages.length), DURATION);
    return () => clearInterval(id);
  }, [messages.length]);

  // Animation: matches website keyframes exactly
  //   0 %  → 30 % (3600 ms) : translateX -100% → centered   (slide in, linear)
  //   30 % → 60 % (3600 ms) : stays centred                 (pause)
  //   60 % → 100% (4800 ms) : centered → 100vw + 100%       (slide out, linear)
  useEffect(() => {
    if (!messages.length) return;
    if (animRef.current) animRef.current.stop();

    const run = () => {
      x.setValue(-W);
      animRef.current = Animated.sequence([
        Animated.timing(x, { toValue: 0,  duration: 3600, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(3600),
        Animated.timing(x, { toValue: W,  duration: 4800, easing: Easing.linear, useNativeDriver: true }),
      ]);
      // Only loop automatically for a single message; multi-message uses the interval above
      animRef.current.start(({ finished }) => { if (finished && messages.length === 1) run(); });
    };

    run();
    return () => animRef.current?.stop();
  }, [idx, messages.length]);

  if (!messages.length) return null;

  // "page" gets lowercased/slash-trimmed for internal route matching below,
  // which would mangle a real URL's path/query casing — so the external-URL
  // check runs on the raw trimmed value first, matching the website's fix
  // for the same "banner page field can't hold a real link" limitation.
  const rawPage = messages[idx]?.page?.trim() || '';
  const isExternal = /^https?:\/\//i.test(rawPage);
  const page = !isExternal ? rawPage.toLowerCase().replace(/^\//, '') : '';
  const target = isExternal || (page && (PAGE_TABS[page] || PAGE_STACK[page]));
  const handlePress = () => {
    if (isExternal) { Linking.openURL(rawPage).catch(() => {}); return; }
    if (!page) return;
    if (PAGE_TABS[page])  { navigation.navigate('MainApp', { screen: PAGE_TABS[page] }); return; }
    if (PAGE_STACK[page]) { navigation.navigate(PAGE_STACK[page]); return; }
  };

  return (
    <Pressable onPress={handlePress} disabled={!target}>
      <View style={[s.wrap, { height: 44 + insets.top, paddingTop: insets.top }]}>
        <Animated.View
          style={[s.track, { transform: [{ translateX: x }] }]}
          pointerEvents="none"
        >
          <Text style={s.text}>{(messages[idx]?.message || '').toUpperCase()}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function makeStyles(T) { return StyleSheet.create({
  wrap:  { backgroundColor: T.red, overflow: 'hidden', justifyContent: 'center' },
  track: { position: 'absolute', bottom: 0, width: W, height: 44, alignItems: 'center', justifyContent: 'center' },
  text:  { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 4, color: '#fff' },
}); }
