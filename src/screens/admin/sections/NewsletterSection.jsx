import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';

// Mirrors the website's AdminNewsletter.jsx — same /newsletter/* endpoints,
// same confirm-before-send flow (Alert.alert here instead of a custom
// modal, matching how every other destructive action in this app confirms).
export default function NewsletterSection() {
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [count,   setCount]   = useState(null);
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState('');

  useEffect(() => {
    api.get('/newsletter/subscribers')
      .then(r => setCount(r.data.count))
      .catch(() => setCount(null));
  }, []);

  const send = async () => {
    setSending(true);
    setResult('');
    try {
      const r = await api.post('/newsletter/send', { subject: subject.trim(), message: message.trim() });
      setResult(r.data.message);
      setSubject('');
      setMessage('');
    } catch (err) {
      setResult(err.response?.data?.message || 'Failed to send newsletter.');
    } finally {
      setSending(false);
    }
  };

  const confirmSend = () => {
    Alert.alert(
      'Send Newsletter',
      `Send "${subject.trim()}" to ${count ?? 0} subscriber${count === 1 ? '' : 's'}? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'destructive', onPress: send },
      ]
    );
  };

  const canSend = subject.trim() && message.trim() && !sending;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.cardLabel}>NEWSLETTER</Text>
        <Text style={s.intro}>
          {count === null ? '…' : count} subscriber{count === 1 ? '' : 's'} currently opted in
        </Text>

        <Text style={s.fieldLabel}>SUBJECT</Text>
        <TextInput
          style={s.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. New Autumn Offers at LEV3L"
          placeholderTextColor={T.textFaint}
        />

        <Text style={s.fieldLabel}>MESSAGE</Text>
        <TextInput
          style={[s.input, s.inputMulti]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write your update here. Plain text — line breaks are kept, no other formatting."
          placeholderTextColor={T.textFaint}
          multiline
        />
        <Text style={s.hint}>Every email includes an unsubscribe link automatically — you don't need to add one.</Text>

        {!!result && <Text style={s.result}>{result}</Text>}

        <TouchableOpacity
          style={[s.btn, !canSend && s.btnDim]}
          onPress={confirmSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnText}>SEND TO {count ?? '…'} SUBSCRIBER{count === 1 ? '' : 'S'}</Text>
          }
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(T) { return StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16 },
  cardLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 3, color: T.red, textTransform: 'uppercase', marginBottom: 8 },
  intro: { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, marginBottom: 16, lineHeight: 18 },

  fieldLabel: { fontFamily: T.fontBodyBd, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: T.fontBody, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  inputMulti: { height: 140, textAlignVertical: 'top', paddingTop: 12 },
  hint: { fontFamily: T.fontBody, fontSize: 11, color: T.textFaint, marginTop: -6, marginBottom: 16, lineHeight: 16 },

  result: { fontFamily: T.fontBodyMd, fontSize: 12, color: T.text, backgroundColor: T.card, padding: 10, marginBottom: 12 },

  btn: { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center' },
  btnDim: { opacity: 0.5 },
  btnText: { fontFamily: T.fontHead, fontSize: 13, letterSpacing: 2, color: '#fff' },
}); }
