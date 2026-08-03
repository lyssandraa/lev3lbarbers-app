import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function PongInviteScreen() {
  const { T, isDark } = useTheme();
  const accent = isDark ? '#60a5fa' : T.red;
  const { user } = useAuth();
  const navigation = useNavigation();
  const s = useMemo(() => makeStyles(T), [T]);

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [inviting,    setInviting]    = useState(false);
  const [inviteErr,   setInviteErr]   = useState('');
  const [promos,      setPromos]      = useState([]);
  const [targetScore, setTargetScore] = useState(7);

  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/banners/public').then(r => {
      const list = r.data?.data || [];
      setPromos(list.filter(b => b.page === 'pong-invite' && b.active !== false));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.get(`/pong/search?q=${encodeURIComponent(query.trim())}`);
        setResults(r.data.users || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const handleInvite = async (target) => {
    if (inviting) return;
    setInviting(true);
    setInviteErr('');
    try {
      const r = await api.post('/pong/invite', { toId: target.id });
      const invite = r.data.invite;
      // Navigate immediately — roomId is already set; wait for opponent in-game
      navigation.replace('PongGame', {
        roomId:       invite.roomId,
        isHost:       true,
        opponentName: target.name,
        p1Id:         user?.id,
        p2Id:         target.id,
        targetScore,
      });
    } catch {
      setInviteErr('Failed to send invite. Try again.');
      setInviting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PING PONG</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.body}>
        {/* Game format */}
        <Text style={s.sectionLabel}>GAME FORMAT</Text>
        <View style={s.formatRow}>
          {[3, 5, 7, 10].map(n => (
            <TouchableOpacity
              key={n}
              style={[s.formatChip, targetScore === n && { borderColor: accent, backgroundColor: `${accent}18` }]}
              onPress={() => setTargetScore(n)}
              activeOpacity={0.7}
            >
              <Text style={[s.formatChipNum, targetScore === n && { color: accent }]}>{n}</Text>
              <Text style={[s.formatChipLbl, targetScore === n && { color: accent }]}>POINTS</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>FIND A PLAYER</Text>

        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={T.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor={T.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={16} color={T.textDim} />
            </Pressable>
          )}
        </View>

        {inviteErr ? <Text style={s.errTxt}>{inviteErr}</Text> : null}

        {searching && <ActivityIndicator color={T.red} style={{ marginTop: 24 }} />}

        {!searching && results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={item => String(item.id)}
            style={{ marginTop: 8 }}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            renderItem={({ item }) => (
              <View style={s.resultRow}>
                <View style={s.resultInfo}>
                  <Text style={s.resultName}>{item.name}</Text>
                </View>
                <TouchableOpacity
                  style={[s.inviteBtn, inviting && s.inviteBtnDim]}
                  onPress={() => handleInvite(item)}
                  disabled={inviting}
                >
                  {inviting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.inviteBtnTxt}>INVITE</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <Text style={s.noResults}>No players found</Text>
        )}

        {query.trim().length < 2 && (
          <View style={s.hint}>
            <Ionicons name="game-controller-outline" size={22} color={accent} style={{ marginBottom: 10 }} />
            <Text style={s.hintTitle}>How to play</Text>
            <Text style={s.hintTxt}>
              Slide your paddle up and down to hit the ball. First player to reach <Text style={{ color: accent, fontFamily: T.fontBodyBd }}>{targetScore} points</Text> wins the match.
            </Text>
            <Text style={[s.hintTxt, { marginTop: 10 }]}>
              Search for a LEV3LBARBERS member below — they'll receive a notification to accept your challenge.
            </Text>
          </View>
        )}

        {promos.length > 0 && query.trim().length < 2 && promos.map((p, i) => (
          <View key={p.id ?? i} style={[s.promoCard, { borderColor: accent, marginTop: i === 0 ? 50 : 55 }]}>
            <View style={[s.promoHeader, { backgroundColor: accent }]}>
              <Ionicons name="megaphone-outline" size={15} color="#fff" />
              <Text style={s.promoHeaderTxt}>DID YOU KNOW?</Text>
            </View>
            <View style={s.promoBody}>
              <Text style={s.promoTxt}>{p.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: T.border,
    },
    headerTitle: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 4, color: T.text },

    body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    sectionLabel: {
      fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 3,
      color: T.textDim, textTransform: 'uppercase', marginBottom: 12,
    },

    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.textFaint,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    searchInput: { flex: 1, fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },

    errTxt: { fontFamily: T.fontBody, fontSize: 12, color: T.red, marginTop: 8 },

    sep: { height: 1, backgroundColor: T.textFaint },
    resultRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, gap: 12,
    },
    resultInfo:  { flex: 1 },
    resultName:  { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
    inviteBtn:    { backgroundColor: T.red, paddingVertical: 9, paddingHorizontal: 18, minWidth: 72, alignItems: 'center' },
    inviteBtnDim: { opacity: 0.5 },
    inviteBtnTxt: { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: '#fff' },

    noResults: {
      fontFamily: T.fontBody, fontSize: 13, color: T.textFaint,
      textAlign: 'center', marginTop: 32,
    },
    formatRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
    formatChip: {
      flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: T.textFaint,
    },
    formatChipNum: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 1, color: T.textDim },
    formatChipLbl: { fontFamily: T.fontBodyBd, fontSize: 8, letterSpacing: 2, color: T.textDim, marginTop: 1 },

    hint: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 8 },
    hintTitle: {
      fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: T.text,
      textTransform: 'uppercase', marginBottom: 10,
    },
    hintTxt: {
      fontFamily: T.fontBodyMd, fontSize: 14, color: T.text,
      textAlign: 'center', lineHeight: 22, opacity: 0.75,
    },
    promoCard: {
      borderWidth: 1.5, overflow: 'hidden',
    },
    promoHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 18, paddingVertical: 12,
    },
    promoHeaderTxt: {
      fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 3,
      color: '#fff', textTransform: 'uppercase',
    },
    promoBody: {
      paddingHorizontal: 20, paddingVertical: 22,
    },
    promoTxt: {
      fontFamily: T.fontBodyMd, fontSize: 17, color: T.text, lineHeight: 26,
    },
  });
}
