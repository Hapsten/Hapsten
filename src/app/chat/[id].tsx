import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMessages, sendMessage, Message, markMessagesAsRead } from '@/firebase/chat';

export default function ChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const chatId = (params as { id?: string }).id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !chatId) return;

    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Mark messages as read
    markMessagesAsRead(chatId, user.uid);

    return () => unsub();
  }, [user, chatId]);

  const handleSend = async () => {
    if (!input.trim() || !user || !chatId) return;
    await sendMessage({
      chatId,
      content: input.trim(),
      senderId: user.uid,
      messageType: 'text',
    });
    setInput('');
  };

  const isSent = (msg: Message) => msg.senderId === user?.uid;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color={Brand.ink} />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText type="title" style={styles.headerTitle} themeColor="text">
              Chat
            </ThemedText>
            <ThemedText type="small" style={styles.headerSub} themeColor="textSecondary">
              Online
            </ThemedText>
          </View>
          <View style={styles.backBtn} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading messages…
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  isSent(msg) ? styles.messageWrapperSent : styles.messageWrapperReceived,
                ]}>
                <View style={styles.messageBubble}>
                  <ThemedText
                    type="default"
                    style={[
                      styles.messageText,
                      isSent(msg) ? styles.messageTextSent : styles.messageTextReceived,
                    ]}
                    themeColor="text"
                  >
                    {msg.content}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[
                      styles.messageTime,
                      isSent(msg) ? styles.messageTimeSent : styles.messageTimeReceived,
                    ]}
                    themeColor="textSecondary"
                  >
                    {msg.createdAt
                      ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </ThemedText>
                </View>
              </View>
            ))}
            {messages.length === 0 && (
              <View style={styles.empty}>
                <ThemedText type="small" themeColor="textSecondary">
                  Start the conversation
                </ThemedText>
              </View>
            )}
          </ScrollView>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
          enabled>
          <View style={styles.inputContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach"
              style={styles.attachBtn}>
              <Ionicons name="add-outline" size={22} color={Brand.inkSecondary} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              multiline={false}
              maxLength={500}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={handleSend}
              disabled={!input.trim()}
              style={[
                styles.sendBtn,
                !input.trim() && styles.sendBtnDisabled,
              ]}>
              <Ionicons name="send-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: Brand.cream,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.ink,
  },
  headerSub: {
    fontSize: 12,
    color: Brand.inkSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  messageWrapper: {
    width: '100%',
    alignItems: 'flex-start',
  },
  messageWrapperSent: {
    alignItems: 'flex-end',
  },
  messageWrapperReceived: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextSent: {
    color: '#fff',
  },
  messageTextReceived: {
    color: Brand.ink,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeSent: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeReceived: {
    color: Brand.inkSecondary,
  },
  empty: {
    marginTop: 40,
    alignSelf: 'center',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  attachBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: Brand.ink,
    fontSize: 15,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Brand.line,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
