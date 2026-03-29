import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, api, PERSONAS } from '../../src/constants';

export default function ChatScreen() {
  const { persona } = useLocalSearchParams<{ persona: string }>();
  const router = useRouter();
  const personaInfo = PERSONAS[persona || 'buddy'] || PERSONAS.buddy;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const history = await api.get(`/chat/${persona}/history`);
      setMessages(history);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sendMessage = async (text: string, imageBase64: string = '') => {
    if (!text.trim() && !imageBase64) return;
    const userMsg = { id: Date.now().toString(), persona, role: 'user', text: text.trim(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    try {
      const response = await api.post(`/chat/${persona}`, { text: text.trim(), image_base64: imageBase64 });
      setMessages(prev => [...prev, response]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString() + '-err', persona, role: 'assistant', text: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() }]);
    }
    finally { setSending(false); }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to share images'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (!result.canceled && result.assets[0].base64) {
      const prompt = persona === 'nutritionist'
        ? 'Analyze this meal/menu image. Identify all foods, estimate calories for each, and advise what to eat and avoid.'
        : 'Here is an image for context. Please analyze it.';
      sendMessage(prompt, result.assets[0].base64);
    }
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Delete all messages with this coach?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await api.del(`/chat/${persona}/history`); setMessages([]); } },
    ]);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]} testID={`msg-${item.id}`}>
        {!isUser && (
          <View style={[styles.msgAvatar, { backgroundColor: personaInfo.color }]}>
            <Ionicons name={personaInfo.icon as any} size={14} color="#FFF" />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.msgText, isUser && { color: '#FFF' }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="chat-back-btn" style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: personaInfo.color }]}>
          <Ionicons name={personaInfo.icon as any} size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{personaInfo.name}</Text>
          <Text style={styles.headerRole}>{personaInfo.role}</Text>
        </View>
        <TouchableOpacity onPress={clearChat} testID="clear-chat-btn" style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={[styles.bigAvatar, { backgroundColor: personaInfo.color }]}>
                  <Ionicons name={personaInfo.icon as any} size={36} color="#FFF" />
                </View>
                <Text style={styles.emptyChatTitle}>Hey! I'm {personaInfo.name}</Text>
                <Text style={styles.emptyChatSub}>{personaInfo.description}</Text>
                <Text style={styles.emptyChatHint}>
                  {persona === 'nutritionist' ? 'Send a photo of your mess menu and I\'ll tell you what to eat!' : persona === 'trainer' ? 'Log some workouts and I\'ll analyze your training!' : 'Ask me anything about fitness - no question is off-limits!'}
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.inputContainer}>
          {(persona === 'nutritionist' || persona === 'buddy') && (
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn} testID="attach-image-btn">
              <Ionicons name="image" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask ${personaInfo.name}...`}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={2000}
            testID="chat-input"
          />
          <TouchableOpacity
            onPress={() => sendMessage(inputText)}
            disabled={sending || !inputText.trim()}
            style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.4 }]}
            testID="send-msg-btn"
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn: { padding: 4 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerRole: { fontSize: 12, color: COLORS.textSecondary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgBubble: { borderRadius: 16, padding: 12, maxWidth: '80%' },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  msgText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  emptyChat: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyChatTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  emptyChatSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyChatHint: { fontSize: 13, color: COLORS.primary, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: COLORS.elevated, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
