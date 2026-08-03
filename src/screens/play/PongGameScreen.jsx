import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../api/api';
import { BACKEND } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { buildPongHtml } from './pongGameHtml';

// Convert https:// → wss:// for the native WebSocket
const WS_URL = BACKEND.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

export default function PongGameScreen() {
  const { T } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { params } = useRoute();
  const { roomId, isHost, opponentName, p1Id, p2Id, targetScore = 7 } = params;
  const s = useMemo(() => makeStyles(T), [T]);

  const webRef       = useRef(null);
  const wsRef        = useRef(null);
  const webReady     = useRef(false);
  const pendingStart = useRef(null);

  const [status,       setStatus]       = useState('connecting');
  const [result,       setResult]       = useState(null);
  const [rematchState, setRematchState] = useState(null); // null | 'waiting' | 'requested'

  // Inject a JS command — queue it if WebView isn't loaded yet
  const inject = (cmd) => {
    if (webReady.current) {
      webRef.current?.injectJavaScript(`${cmd}; true;`);
    } else {
      pendingStart.current = cmd;
    }
  };

  const onWebLoadEnd = () => {
    webReady.current = true;
    if (pendingStart.current) {
      webRef.current?.injectJavaScript(`${pendingStart.current}; true;`);
      pendingStart.current = null;
    }
  };

  const wsSend = (data) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/pong-ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId, userId: user?.id, isHost, win: isHost ? targetScore : undefined }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case 'waiting':
            setStatus('waiting');
            break;
          case 'start':
            setStatus('playing');
            inject(`setWin(${msg.win || targetScore}); ${isHost ? 'startAsHost()' : 'startAsGuest()'}`);
            break;
          case 'paddle':
            webRef.current?.injectJavaScript(`updateOpponentPaddle(${msg.y}); true;`);
            break;
          case 'ball':
            webRef.current?.injectJavaScript(`updateBall(${msg.x},${msg.y}); true;`);
            break;
          case 'score':
            webRef.current?.injectJavaScript(`updateScore(${msg.s1},${msg.s2}); true;`);
            break;
          case 'scoreUpdate':
            // Guest gets score updates after each miss so display stays in sync
            webRef.current?.injectJavaScript(`updateScore(${msg.s1},${msg.s2}); true;`);
            break;
          case 'ended': {
            const iWon = isHost ? msg.winner === 1 : msg.winner === 2;
            setResult({ s1: msg.s1, s2: msg.s2, iWon });
            setStatus('ended');
            // Only host records — prevents the double-entry from both players calling this
            if (msg.winner && isHost) {
              const winnerId = msg.winner === 1 ? p1Id : p2Id;
              api.post('/pong/match', {
                roomId, p1Id, p2Id, winnerId,
                score1: msg.s1, score2: msg.s2,
              }).catch(() => {});
            }
            break;
          }
          case 'opponent-left':
            setResult({ opponentLeft: true });
            setStatus('ended');
            setRematchState(null);
            break;
          case 'opponent-forfeited':
            setResult({ opponentLeft: true, forfeited: true });
            setStatus('ended');
            setRematchState(null);
            break;
          case 'rematch-waiting':
            setRematchState('waiting');
            break;
          case 'rematch-request':
            setRematchState('requested');
            break;
          case 'rematch-ready':
            setRematchState(null);
            setResult(null);
            setStatus('playing');
            inject(isHost ? 'startAsHost()' : 'startAsGuest()');
            break;
        }
      } catch {}
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      setStatus(prev => (prev === 'playing' || prev === 'connecting' || prev === 'waiting') ? 'error' : prev);
    };

    return () => {
      ws.onclose = null;
      ws.close();
    };
  }, []);

  // Bridge WebView → WebSocket
  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      switch (data.type) {
        case 'paddleMove':
          wsSend({ type: 'paddle', y: data.y });
          break;
        case 'ballUpdate':
          wsSend({ type: 'ball', x: data.x, y: data.y });
          break;
        case 'scoreUpdate':
          wsSend({ type: 'score', s1: data.s1, s2: data.s2 });
          break;
        case 'gameOver':
          wsSend({ type: 'game-over', winner: data.winner, s1: data.s1, s2: data.s2 });
          break;
      }
    } catch {}
  };

  const leave = () => {
    wsRef.current?.close();
    navigation.goBack();
  };

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Match?',
      'Your opponent will be awarded the win.',
      [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'Forfeit', style: 'destructive',
          onPress: () => { wsSend({ type: 'forfeit' }); leave(); },
        },
      ],
    );
  };

  const handleRematch = () => {
    wsSend({ type: 'rematch' });
  };

  return (
    <View style={s.root}>
      {/* WebView always rendered so it loads in background */}
      <WebView
        ref={webRef}
        source={{ html: buildPongHtml(targetScore) }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onLoadEnd={onWebLoadEnd}
        scrollEnabled={false}
        javaScriptEnabled
        style={{ flex: 1, opacity: status === 'playing' ? 1 : 0 }}
      />

      {status === 'connecting' && (
        <View style={s.overlay}>
          <ActivityIndicator color={T.red} size="large" />
          <Text style={s.overlayTxt}>Connecting...</Text>
        </View>
      )}

      {status === 'waiting' && (
        <View style={s.overlay}>
          <ActivityIndicator color={T.red} size="large" />
          <Text style={s.overlayTxt}>Waiting for {opponentName}...</Text>
          <TouchableOpacity style={s.cancelBtn} onPress={leave}>
            <Text style={s.cancelTxt}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={s.overlay}>
          <Ionicons name="wifi-outline" size={40} color="#555" />
          <Text style={s.overlayTxt}>Couldn't connect to game server</Text>
          <TouchableOpacity style={s.cancelBtn} onPress={leave}>
            <Text style={s.cancelTxt}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ended' && result && (
        <View style={s.overlay}>
          <Text style={s.resultTitle}>
            {result.opponentLeft
              ? (result.forfeited ? 'OPPONENT FORFEITED' : 'OPPONENT LEFT')
              : result.iWon ? 'YOU WIN!' : 'YOU LOSE'}
          </Text>
          {!result.opponentLeft && (
            <Text style={s.resultScore}>
              {isHost ? result.s1 : result.s2} — {isHost ? result.s2 : result.s1}
            </Text>
          )}

          {/* Play again flow */}
          {!result.opponentLeft && (
            rematchState === 'waiting' ? (
              <>
                <Text style={s.rematchWait}>Waiting for {opponentName}…</Text>
                <TouchableOpacity style={s.cancelBtn} onPress={leave}>
                  <Text style={s.cancelTxt}>CANCEL</Text>
                </TouchableOpacity>
              </>
            ) : rematchState === 'requested' ? (
              <>
                <Text style={s.rematchWait}>{opponentName} wants a rematch!</Text>
                <TouchableOpacity style={s.resultBtn} onPress={handleRematch}>
                  <Text style={s.resultBtnTxt}>PLAY AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={leave}>
                  <Text style={s.cancelTxt}>DECLINE</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.resultBtn} onPress={handleRematch}>
                  <Text style={s.resultBtnTxt}>PLAY AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={leave}>
                  <Text style={s.cancelTxt}>BACK TO PLAY</Text>
                </TouchableOpacity>
              </>
            )
          )}

          {result.opponentLeft && (
            <TouchableOpacity style={s.cancelBtn} onPress={leave}>
              <Text style={s.cancelTxt}>BACK TO PLAY</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {status === 'playing' && (
        <SafeAreaView style={s.closeWrap} pointerEvents="box-none" edges={['top']}>
          <TouchableOpacity
            style={s.forfeitBtn}
            onPress={handleForfeit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.forfeitTxt}>FORFEIT</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0a0a0a' },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#0a0a0a',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
    },
    overlayTxt: {
      fontFamily: T.fontBodyMd,
      fontSize: 13,
      letterSpacing: 2,
      color: '#888',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    cancelBtn: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    cancelTxt:    { fontFamily: T.fontBodyMd, fontSize: 12, letterSpacing: 2, color: '#888' },
    rematchWait:  { fontFamily: T.fontBodyMd, fontSize: 12, letterSpacing: 2, color: '#888', textAlign: 'center' },
    resultTitle: { fontFamily: T.fontHead, fontSize: 52, letterSpacing: 4, color: '#fff', textAlign: 'center' },
    resultScore: { fontFamily: T.fontBodyBd, fontSize: 28, color: 'rgba(255,255,255,0.5)', letterSpacing: 4 },
    resultBtn:   { marginTop: 16, backgroundColor: T.red, paddingVertical: 16, paddingHorizontal: 40 },
    resultBtnTxt:{ fontFamily: T.fontHead, fontSize: 16, letterSpacing: 3, color: '#fff' },
    closeWrap:   { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'flex-end', paddingRight: 16 },
    forfeitBtn:  { padding: 8, marginTop: 4 },
    forfeitTxt:  { fontFamily: T.fontBodyMd, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.3)' },
  });
}
