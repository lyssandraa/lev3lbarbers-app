import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function IncomingInviteModal() {
  const { user } = useAuth();
  const { T }    = useTheme();
  const navigation = useNavigation();

  const [invite,     setInvite]     = useState(null);
  const [responding, setResponding] = useState(false);

  const pollRef    = useRef(null);
  const appStateSub = useRef(null);

  const poll = async () => {
    if (!user) return;
    try {
      const r = await api.get('/pong/invites/pending');
      const invites = r.data.invites || [];
      if (invites.length > 0) setInvite(invites[0]);
      else if (invite) setInvite(null);
    } catch {}
  };

  useEffect(() => {
    if (!user) { clearInterval(pollRef.current); return; }

    poll();
    pollRef.current = setInterval(poll, 10_000);

    appStateSub.current = AppState.addEventListener('change', state => {
      if (state === 'active') poll();
    });

    return () => {
      clearInterval(pollRef.current);
      appStateSub.current?.remove();
    };
  }, [user]);

  const respond = async (accept) => {
    if (!invite || responding) return;
    setResponding(true);
    try {
      const r = await api.patch(`/pong/invites/${invite.id}`, { accept });
      if (accept) {
        const updated = r.data.invite;
        setInvite(null);
        navigation.navigate('PongGame', {
          roomId:       updated.roomId,
          isHost:       false,
          opponentName: updated.from?.name || 'Opponent',
          p1Id:         updated.fromId,
          p2Id:         user?.id || user?._id,
        });
      } else {
        setInvite(null);
      }
    } catch {
      setInvite(null);
    } finally {
      setResponding(false);
    }
  };

  if (!invite) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.iconRow}>
            <Ionicons name="game-controller" size={28} color={T.red} />
          </View>
          <Text style={[s.title, { fontFamily: T.fontHead, color: T.text }]}>GAME INVITE</Text>
          <Text style={[s.sub, { fontFamily: T.fontBody, color: T.textDim }]}>
            <Text style={[s.name, { fontFamily: T.fontBodyBd, color: T.text }]}>
              {invite.from?.name || 'Someone'}
            </Text>
            {' '}challenged you to a Ping Pong match!
          </Text>

          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, s.declineBtn, { borderColor: T.border }]}
              onPress={() => respond(false)}
              disabled={responding}
            >
              <Text style={[s.btnTxt, { fontFamily: T.fontBodyBd, color: T.textDim }]}>DECLINE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.acceptBtn, { backgroundColor: T.red }]}
              onPress={() => respond(true)}
              disabled={responding}
            >
              <Text style={[s.btnTxt, { fontFamily: T.fontBodyBd, color: '#fff' }]}>ACCEPT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%', padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  iconRow:  { marginBottom: 4 },
  title:    { fontSize: 22, letterSpacing: 4 },
  sub:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  name:     { fontSize: 14 },
  btnRow:   { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  btn:      { flex: 1, paddingVertical: 14, alignItems: 'center' },
  declineBtn: { borderWidth: 1 },
  acceptBtn:  {},
  btnTxt:   { fontSize: 12, letterSpacing: 2 },
});
