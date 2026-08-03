import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { buildSnakeHtml } from './snakeGameHtml';

const PONG_MEDALS = { 1: '#C4922A', 2: '#9e9e9e', 3: '#cd7f32' };

const BEST_KEY = 'snake_personal_best';

const MEDALS = { 1: '#C4922A', 2: '#9e9e9e', 3: '#cd7f32' };

export default function PlayScreen() {
  const { T, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { top: topInset } = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(T), [T]);
  const scrollRef = useRef(null);
  const webRef    = useRef(null);

  const [board,       setBoard]       = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [weekLabel,   setWeekLabel]   = useState('');
  const [weekPrize,   setWeekPrize]   = useState('');

  const [personalBest,    setPersonalBest]    = useState(0);
  const [snakePromos,     setSnakePromos]     = useState([]);
  const [activePromo,     setActivePromo]     = useState(null);
  const promoIdxRef = useRef(0);

  const [pongBoard,        setPongBoard]        = useState([]);
  const [loadingPongBoard, setLoadingPongBoard] = useState(true);

  const [showGame,  setShowGame]  = useState(false);
  const [gameOver,  setGameOver]  = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitError,  setSubmitError]  = useState(false);
  const [submitRank,   setSubmitRank]   = useState(null);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    fetchBoard();
    fetchPongBoard();
    api.get('/scores/prize').then(r => setWeekPrize(r.data.prize || '')).catch(() => {});
    api.get('/banners/public').then(r => {
      const all = r.data?.data || [];
      setSnakePromos(all.filter(b => b.page === 'snake-start' && b.active !== false));
    }).catch(() => {});
    AsyncStorage.getItem(BEST_KEY).then(v => {
      if (v) setPersonalBest(parseInt(v, 10));
    });
  }, []));

  const fetchPongBoard = async () => {
    setLoadingPongBoard(true);
    try {
      const r = await api.get('/pong/leaderboard');
      setPongBoard(r.data.leaderboard || []);
    } catch {
      setPongBoard([]);
    } finally {
      setLoadingPongBoard(false);
    }
  };

  const fetchBoard = async () => {
    setLoadingBoard(true);
    try {
      const r = await api.get('/scores/weekly');
      const scores = r.data.scores || r.data || [];
      setBoard(scores);
      if (r.data.weekEnd) {
        const d = new Date(r.data.weekEnd);
        setWeekLabel(`Week ending ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
      }
    } catch {
      setBoard([]);
    } finally {
      setLoadingBoard(false);
    }
  };

  const openGame = () => {
    setGameScore(0);
    setGameOver(false);
    setIsNewBest(false);
    setSubmitted(false);
    setSubmitError(false);
    setSubmitRank(null);
    if (snakePromos.length > 0) {
      setActivePromo(snakePromos[promoIdxRef.current % snakePromos.length]);
      promoIdxRef.current += 1;
    } else {
      setActivePromo(null);
    }
    setShowGame(true);
  };

  const closeGame = () => {
    setShowGame(false);
    setGameOver(false);
    if (submitted) fetchBoard();
  };

  const onMessage = useCallback((e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'gameOver') {
        const { score } = data;
        setGameScore(score);
        setGameOver(true);
        // Check and save personal best
        AsyncStorage.getItem(BEST_KEY).then(stored => {
          const prev = stored ? parseInt(stored, 10) : 0;
          if (score > prev) {
            setIsNewBest(true);
            setPersonalBest(score);
            AsyncStorage.setItem(BEST_KEY, String(score));
          }
        });
      }
    } catch {}
  }, []);

  const handleSubmit = async () => {
    if (!user || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      await api.post('/scores', { score: gameScore, game: 'snake' });
      setSubmitted(true);
      // Refresh board immediately so rank is visible in the overlay
      const r = await api.get('/scores/weekly');
      const scores = r.data.scores || r.data || [];
      setBoard(scores);
      if (r.data.weekEnd) {
        const d = new Date(r.data.weekEnd);
        setWeekLabel(`Week ending ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
      }
      const rank = scores.findIndex(e => e.userId === user._id || e.userId === user.id || e.email === user.email);
      if (rank >= 0) setSubmitRank(rank + 1);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const playAgain = () => {
    setGameOver(false);
    setIsNewBest(false);
    setSubmitted(false);
    setSubmitError(false);
    setSubmitRank(null);
    webRef.current?.injectJavaScript('restart(); true;');
  };

  const handleSignIn = () => {
    setShowGame(false);
    setGameOver(false);
    navigation.navigate('Login');
  };

  const myRank = user
    ? board.findIndex(e => e.userId === user._id || e.userId === user.id || e.email === user.email) + 1
    : 0;

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <ScrollView ref={scrollRef} style={s.root} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>LEV3L BARBERS</Text>
          <Text style={s.pageTitle}>PLAY</Text>
          <View style={s.rule} />
        </View>

        {/* ── Game cards row ── */}
        <View style={s.gamesRow}>

          {/* Snake */}
          <View style={s.gameCard}>
            <View style={[s.playerBadge, { backgroundColor: '#42a5f522', borderColor: '#42a5f555' }]}>
              <Text style={[s.playerBadgeTxt, { color: '#42a5f5' }]}>1 PLAYER</Text>
            </View>
            <Ionicons name="game-controller" size={36} color="#42a5f5" style={{ marginBottom: 8 }} />
            <Text style={s.gameCardTitle}>SNAKE</Text>
            <TouchableOpacity style={[s.gameCardBtn, { backgroundColor: '#42a5f5' }]} onPress={openGame} activeOpacity={0.85}>
              <Text style={s.gameCardBtnTxt}>PLAY</Text>
            </TouchableOpacity>
          </View>

          {/* Ping Pong */}
          <View style={s.gameCard}>
            <View style={[s.playerBadge, { backgroundColor: T.red + '22', borderColor: T.red + '55' }]}>
              <Text style={[s.playerBadgeTxt, { color: T.red }]}>2 PLAYERS</Text>
            </View>
            <Ionicons name="tablet-landscape-outline" size={36} color={T.red} style={{ marginBottom: 8 }} />
            <Text style={s.gameCardTitle}>PING PONG</Text>
            {user ? (
              <TouchableOpacity style={[s.gameCardBtn, { backgroundColor: T.red }]} onPress={() => navigation.navigate('PongInvite')} activeOpacity={0.85}>
                <Text style={s.gameCardBtnTxt}>PLAY</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.gameCardBtn, { backgroundColor: T.red }]} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
                <Text style={s.gameCardBtnTxt}>SIGN IN</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>

        {/* ── Weekly prize notice ── */}
        <View style={s.prizeCard}>
          <Ionicons name="trophy" size={22} color={T.gold} />
          <View style={{ flex: 1 }}>
            <Text style={s.prizeTitle}>WEEKLY WINNER PRIZE</Text>
            <Text style={s.prizeSub}>
              {weekPrize
                ? `Participate to win: ${weekPrize}`
                : 'The top player each Sunday earns a reward. Claim it in store.'}
            </Text>
          </View>
        </View>

        {/* ── Leaderboard ── */}
        <View style={s.boardSection}>
          <View style={s.boardHead}>
            <Ionicons name="trophy" size={16} color={T.gold} style={{ marginRight: 8 }} />
            <Text style={s.boardTitle}>WEEKLY LEADERBOARD</Text>
          </View>
          {weekLabel ? <Text style={s.weekLabel}>{weekLabel}</Text> : null}

          {loadingBoard ? (
            <ActivityIndicator color={T.gold} style={{ marginTop: 32 }} />
          ) : board.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>NO SCORES YET</Text>
              <Text style={s.emptySub}>Be the first to climb the board this week</Text>
            </View>
          ) : (
            board.slice(0, 10).map((entry, idx) => {
              const rank  = idx + 1;
              const isMe  = rank === myRank;
              const name  = entry.name || entry.username || entry.email?.split('@')[0] || 'Anonymous';
              return (
                <View key={idx} style={[s.row, isMe && s.rowMe]}>
                  <Text style={[s.rowRank, MEDALS[rank] && { color: MEDALS[rank] }]}>
                    #{rank}
                  </Text>
                  <Text style={[s.rowName, isMe && { color: T.gold }]} numberOfLines={1}>
                    {name}{isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={[s.rowScore, isMe && { color: T.gold }]}>{entry.score}</Text>
                </View>
              );
            })
          )}

          {myRank > 10 && (
            <View style={s.myRankRow}>
              <Text style={s.myRankTxt}>YOUR RANK  #{myRank}</Text>
            </View>
          )}
        </View>

        {/* ── Pong leaderboard ── */}
        <View style={s.boardSection}>
          <View style={s.boardHead}>
            <Ionicons name="stats-chart" size={16} color={T.red} style={{ marginRight: 8 }} />
            <Text style={s.boardTitle}>PONG LEADERBOARD</Text>
          </View>

          {loadingPongBoard ? (
            <ActivityIndicator color={T.red} style={{ marginTop: 32 }} />
          ) : pongBoard.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>NO MATCHES YET</Text>
              <Text style={s.emptySub}>Be the first to challenge someone</Text>
            </View>
          ) : (
            <>
              <View style={s.pongHeader}>
                <View style={{ width: 32 }} />
                <Text style={[s.pongCol, { flex: 1, textAlign: 'left' }]}>PLAYER</Text>
                <Text style={s.pongCol}>W</Text>
                <Text style={s.pongCol}>L</Text>
                <Text style={s.pongCol}>TOT</Text>
              </View>
              {pongBoard.slice(0, 10).map((entry, idx) => {
                const rank = idx + 1;
                const isMe = entry.userId === (user?.id || user?._id);
                return (
                  <View key={idx} style={[s.row, isMe && s.rowMe]}>
                    <Text style={[s.rowRank, PONG_MEDALS[rank] && { color: PONG_MEDALS[rank] }]}>
                      #{rank}
                    </Text>
                    <Text style={[s.rowName, isMe && { color: T.red }]} numberOfLines={1}>
                      {entry.name || 'Unknown'}{isMe ? ' (you)' : ''}
                    </Text>
                    <Text style={[s.pongStat, isMe && { color: T.red }]}>{entry.wins}</Text>
                    <Text style={[s.pongStat, { color: T.textDim }]}>{entry.losses}</Text>
                    <Text style={[s.pongStat, { color: T.textDim }]}>{entry.total}</Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Game modal ── */}
      <Modal
        visible={showGame}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeGame}
      >
        <View style={[s.gameModal, { backgroundColor: isDark ? '#0e0e0e' : '#f0ede6' }]}>
          {/* Close bar */}
          <View style={[s.gameBar, { paddingTop: topInset + 6 }]}>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={closeGame}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={26} color={isDark ? '#e8e3da' : '#1a1a1a'} />
            </TouchableOpacity>
          </View>

          {/* Game */}
          <WebView
            ref={webRef}
            style={{ flex: 1 }}
            source={{ html: buildSnakeHtml(isDark, T, personalBest, activePromo ? [activePromo] : []) }}
            originWhitelist={['*']}
            onMessage={onMessage}
            scrollEnabled={false}
            javaScriptEnabled
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />

          {/* Game over overlay */}
          {gameOver && (
            <View style={s.overlay}>
              <Text style={s.goTitle}>GAME OVER</Text>
              {isNewBest && (
                <View style={s.newBestBadge}>
                  <Ionicons name="trophy" size={14} color="#1a1a1a" />
                  <Text style={s.newBestTxt}>NEW PERSONAL BEST</Text>
                </View>
              )}
              <Text style={s.goLbl}>FINAL SCORE</Text>
              <Text style={s.goScore}>{gameScore}</Text>

              {!submitted ? (
                user ? (
                  <>
                    <TouchableOpacity
                      style={s.goBtn}
                      onPress={handleSubmit}
                      disabled={submitting}
                      activeOpacity={0.85}
                    >
                      {submitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.goBtnTxt}>SUBMIT SCORE</Text>
                      }
                    </TouchableOpacity>
                    {submitError && (
                      <Text style={s.goError}>Could not submit — check your connection</Text>
                    )}
                  </>
                ) : (
                  <TouchableOpacity style={s.goBtn} onPress={handleSignIn} activeOpacity={0.85}>
                    <Text style={s.goBtnTxt}>SIGN IN TO SUBMIT</Text>
                  </TouchableOpacity>
                )
              ) : (
                <View style={s.goSubmittedWrap}>
                  <View style={s.goSubmitted}>
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text style={s.goSubmittedTxt}>SCORE SUBMITTED</Text>
                  </View>
                  {submitRank && (
                    <Text style={s.goRank}>YOU'RE #{submitRank} THIS WEEK</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[s.goBtn, s.goBtnOutline]}
                onPress={playAgain}
                activeOpacity={0.85}
              >
                <Text style={[s.goBtnTxt, { color: '#fff' }]}>PLAY AGAIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.goLeave}
                onPress={closeGame}
                activeOpacity={0.7}
              >
                <Text style={s.goLeaveTxt}>LEAVE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  root:       { flex: 1, backgroundColor: T.bg },

  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: T.textFaint,
  },
  eyebrow:   { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 4, color: T.red, marginBottom: 3, textTransform: 'uppercase' },
  pageTitle: { fontFamily: T.fontHead, fontSize: 44, letterSpacing: 2, color: T.text, lineHeight: 44 },
  rule:      { width: 36, height: 2, backgroundColor: T.red, marginTop: 10 },

  gamesRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: T.textFaint,
  },
  gameCard: {
    flex: 1, alignItems: 'center',
    paddingVertical: 20, paddingHorizontal: 12,
    backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.textFaint,
    gap: 6,
  },
  playerBadge: {
    backgroundColor: T.gold + '22',
    borderWidth: 1, borderColor: T.gold + '55',
    paddingVertical: 3, paddingHorizontal: 8,
    marginBottom: 4,
  },
  playerBadgeTxt: {
    fontFamily: T.fontBodyBd, fontSize: 8,
    letterSpacing: 2, color: T.gold,
  },
  gameCardTitle: { fontFamily: T.fontHead, fontSize: 28, letterSpacing: 3, color: T.text },
  gameCardBtn:   { width: '100%', paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  gameCardBtnTxt:{ fontFamily: T.fontHead, fontSize: 14, letterSpacing: 3, color: '#fff' },

  boardSection: { paddingHorizontal: 20, paddingTop: 24 },
  boardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  boardTitle:{ fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 3, color: T.text, textTransform: 'uppercase' },
  weekLabel: { fontFamily: T.fontBodyMd, fontSize: 11, color: T.text, opacity: 0.6, marginBottom: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.textFaint,
    gap: 12,
  },
  rowMe:     { backgroundColor: T.surface, marginHorizontal: -20, paddingHorizontal: 20 },
  rowRank:   { fontFamily: T.fontBodyBd, fontSize: 13, color: T.text, opacity: 0.55, width: 32 },
  rowName:   { fontFamily: T.fontBodyMd, fontSize: 14, color: T.text, flex: 1 },
  rowScore:  { fontFamily: T.fontBodyBd, fontSize: 14, color: T.text },

  myRankRow:  { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.textFaint, marginTop: 4 },
  myRankTxt:  { fontFamily: T.fontBodyBd, fontSize: 11, letterSpacing: 2, color: T.gold },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: T.fontHead, fontSize: 22, letterSpacing: 3, color: T.text, marginBottom: 6 },
  emptySub:   { fontFamily: T.fontBody, fontSize: 13, color: T.textDim, textAlign: 'center' },

  // Game modal
  gameModal:  { flex: 1 },
  gameBar: {
    paddingHorizontal: 16, paddingBottom: 6,
    alignItems: 'flex-end',
  },
  closeBtn:   { padding: 4 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  goTitle:   { fontFamily: T.fontHead, fontSize: 42, letterSpacing: 6, color: T.gold, marginBottom: 4 },
  goLbl:     { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 4, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: 4 },
  goScore:   { fontFamily: T.fontHead, fontSize: 72, color: '#fff', lineHeight: 72, marginBottom: 28 },

  goBtn:     { backgroundColor: T.red, paddingVertical: 15, paddingHorizontal: 40, alignItems: 'center', marginVertical: 6, minWidth: 220 },
  goBtnTxt:  { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
  goBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  goHint:    { fontFamily: T.fontBody, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 10, textAlign: 'center' },
  goError:   { fontFamily: T.fontBody, fontSize: 12, color: '#e57373', marginTop: 6, textAlign: 'center' },
  goSubmittedWrap: { alignItems: 'center', marginBottom: 4 },
  goSubmitted: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goSubmittedTxt: { fontFamily: T.fontBodyMd, fontSize: 13, letterSpacing: 2, color: '#22c55e' },
  goRank:    { fontFamily: T.fontHead, fontSize: 20, letterSpacing: 3, color: T.gold, marginBottom: 8 },
  goLeave:   { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24 },
  goLeaveTxt:{ fontFamily: T.fontBodyMd, fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },

  newBestBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.gold, paddingVertical: 5, paddingHorizontal: 14, marginBottom: 16 },
  newBestTxt:   { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 2, color: '#1a1a1a' },

  prizeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginTop: 20, marginBottom: 4,
    padding: 16,
    backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.goldDim || T.gold,
  },
  prizeTitle: { fontFamily: T.fontBodyBd, fontSize: 10, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 4 },
  prizeSub:   { fontFamily: T.fontBody, fontSize: 12, color: T.text, opacity: 0.7, lineHeight: 18 },

  pongHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.textFaint,
    gap: 12, marginBottom: 4,
  },
  pongCol: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, width: 32, textAlign: 'right' },
  pongStat: { fontFamily: T.fontBodyBd, fontSize: 13, color: T.text, width: 32, textAlign: 'right' },
}); }
