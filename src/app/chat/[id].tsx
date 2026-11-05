import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMessages, sendMessage, Message } from '@/firebase/chat';

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
    import('@/firebase/chat').then(({ markMessagesAsRead }) => {
      markMessagesAsRead(chatId, user.uid);
    });

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
    // Scroll to bottom after sending
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isSent = (msg: Message) => msg.senderId === user?.uid;

  // Check if message is read by everyone (double check)
  const isRead = (msg: Message) => {
    if (isSent(msg)) {
      return msg.readBy?.length > 1;
    }
    return true;
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if we need a date separator
  const isNewDay = (index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1].createdAt?.toDate?.() ?? new Date(0);
    const curr = messages[index].createdAt?.toDate?.() ?? new Date(0);
    return prev.toDateString() !== curr.toDateString();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

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
          <View style={[styles.backBtn, { opacity: 0 }]} />
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
            {messages.map((msg, index) => (
              <View key={msg.id} style={styles.messageContainer}>
                {isNewDay(index) && (
                  <View style={styles.dateSeparator}>
                    <ThemedText type="small" style={styles.dateText} themeColor="textSecondary">
                      {formatDate(msg.createdAt)}
                    </ThemedText>
                  </View>
                )}
                <View
                  style={[
                    styles.messageWrapper,
                    isSent(msg) ? styles.messageWrapperSent : styles.messageWrapperReceived,
                  ]}>
                  {isSent(msg) ? null : (
                    <View style={styles.avatar}>
                      <ThemedText
                        type="smallBold"
                        style={styles.avatarText}
                        themeColor="text"
                      >
                        U
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.bubbleContainer}>
                    <View style={[styles.bubble, isSent(msg) ? styles.bubbleSent : styles.bubbleReceived]}>
                      <ThemedText
                        type="default"
                        style={[
                          styles.messageText,
                          isSent(msg) ? styles.messageTextSent : styles.messageTextReceived,
                        ]}
                      >
                        {msg.content}
                      </ThemedText>
                    </View>
                    <View style={styles.statusRow}>
                      <ThemedText
                        type="small"
                        style={[
                          styles.messageTime,
                          isSent(msg) ? styles.messageTimeSent : styles.messageTimeReceived,
                        ]}
                      >
                        {formatTime(msg.createdAt)}
                      </ThemedText>
                      {isSent(msg) && (
                        <Ionicons
                          name={isRead(msg) ? 'checkmark-circle' : 'checkmark'}
                          size={16}
                          color={
                            isRead(msg)
                              ? Brand.coral
                              : isSent(msg)
                              ? 'rgba(255,255,255,0.7)'
                              : Brand.inkSecondary
                          }
                        />
                      )}
                    </View>
                  </View>
                  {!isSent(msg) ? null : (
                    <View style={styles.avatar}>
                      <ThemedText
                        type="smallBold"
                        style={styles.avatarText}
                        themeColor="text"
                      >
                        U
                      </ThemedText>
                    </View>
                  )}
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
    gap: 8,
    justifyContent: 'flex-end',
    minHeight: '100%',
  },
  messageContainer: {
    width: '100%',
    marginBottom: 4,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.inkSecondary,
    backgroundColor: '#EDE8DF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  messageWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageWrapperSent: {
    alignItems: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageWrapperReceived: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.ink,
  },
  bubbleContainer: {
    maxWidth: '75%',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleSent: {
    backgroundColor: Brand.coral,
  },
  bubbleReceived: {
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeSent: {
    color: 'rgba(255,255,255,0.7)',
    marginRight: 4,
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
    gap: 8,
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
