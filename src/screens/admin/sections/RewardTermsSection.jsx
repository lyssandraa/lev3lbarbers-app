import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import { buildEditorHtml } from './legalEditorHtml';

export default function RewardTermsSection() {
  const { T, isDark } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const webRef = useRef(null);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [content,  setContent]  = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    api.get('/reward-terms')
      .then(r => {
        const terms = r.data.terms || r.data;
        setContent(terms.content || '');
        setIsActive(terms.isActive !== false);
      })
      .catch(() => Alert.alert('Error', 'Could not load reward terms.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/reward-terms', { content, isActive });
      Alert.alert('Saved', 'Reward terms updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onMessage = useCallback((e) => setContent(e.nativeEvent.data), []);

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
      <View style={s.switchCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.switchLabel}>{isActive ? 'Terms ACTIVE' : 'Terms INACTIVE'}</Text>
          <Text style={s.switchSub}>{isActive ? 'Shown to customers' : 'Hidden from customers'}</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: '#22c55e', false: T.border }}
          thumbColor={isActive ? '#fff' : T.textFaint}
        />
      </View>

      <Text style={s.hint}>
        Use the toolbar to format headings, bold text, and lists. Changes are saved when you tap Save.
      </Text>

      <View style={s.editorCard}>
        <WebView
          ref={webRef}
          style={s.editor}
          source={{ html: buildEditorHtml(content, isDark, T) }}
          originWhitelist={['*']}
          onMessage={onMessage}
          scrollEnabled
          keyboardDisplayRequiresUserAction={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <TouchableOpacity
        style={[s.btn, saving && s.btnDim]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.btnText}>SAVE REWARD TERMS</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
  );
}

function makeStyles(T) { return StyleSheet.create({
  wrap:       { flex: 1, padding: 14, paddingBottom: 0 },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
                padding: 14, marginBottom: 12 },
  switchLabel:{ fontFamily: T.fontBodyMd, fontSize: 14, color: T.text },
  switchSub:  { fontFamily: T.fontBody, fontSize: 11, color: T.textDim, marginTop: 2 },
  hint:       { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18,
                marginBottom: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  editorCard: { flex: 1, borderWidth: 1, borderColor: T.border, overflow: 'hidden', minHeight: 360 },
  editor:     { flex: 1, backgroundColor: 'transparent' },
  btn:        { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  btnDim:     { opacity: 0.5 },
  btnText:    { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
