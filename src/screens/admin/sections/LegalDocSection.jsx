import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import { buildEditorHtml } from './legalEditorHtml';

// endpoint: '/general-terms' | '/privacy-notice' | '/reward-terms'
// dataKey:  'terms' | 'notice'
export default function LegalDocSection({ endpoint, dataKey, title }) {
  const { T, isDark } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const webRef = useRef(null);

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [content, setContent]   = useState('');

  useEffect(() => {
    api.get(endpoint)
      .then(r => {
        const html = r.data[dataKey]?.content || r.data.content || '';
        setContent(html);
      })
      .catch(() => Alert.alert('Error', `Could not load ${title}.`))
      .finally(() => setLoading(false));
  }, [endpoint, dataKey]);

  const save = async () => {
    setSaving(true);
    try {
      // Backend expects the body key to always be "content", regardless of
      // which document this is (dataKey is only the response-wrapper key on
      // GET, e.g. { terms: {...} } vs { notice: {...} }).
      await api.put(endpoint, { content });
      Alert.alert('Saved', `${title} updated.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onMessage = useCallback((e) => {
    setContent(e.nativeEvent.data);
  }, []);

  if (loading) return <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
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
          : <Text style={s.btnText}>SAVE {title.toUpperCase()}</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
  );
}


function makeStyles(T) { return StyleSheet.create({
  wrap:      { flex: 1, padding: 14, paddingBottom: 0 },
  hint:      { fontFamily: T.fontBody, fontSize: 12, color: T.textDim, lineHeight: 18,
               marginBottom: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: T.border },
  editorCard:{ flex: 1, borderWidth: 1, borderColor: T.border, overflow: 'hidden', minHeight: 420 },
  editor:    { flex: 1, backgroundColor: 'transparent' },
  btn:       { backgroundColor: T.red, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  btnDim:    { opacity: 0.5 },
  btnText:   { fontFamily: T.fontHead, fontSize: 15, letterSpacing: 3, color: '#fff' },
}); }
