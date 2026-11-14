import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSport } from '@/constants/sports';
import { Brand } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  markChatRead,
  sendMessage,
  subscribeToChat,
  subscribeToMessages,
  type Chat,
  type Message,
} from '@/firebase/chat';
import { subscribeToEvent } from '@/firebase/events';
import { formatDayLabel, formatWindow } from '@/lib/plan-time';
import type { SportEvent } from '@/types/models';

export default function ChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const chatId = (params as { id?: string }).id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = subscribeToChat(chatId, setChat);
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = subscribeToEvent(chatId, setEvent);
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(
      chatId,
      (next) => {
        setMessages(next);
        setLoading(false);
        scrollToEnd();
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [chatId, scrollToEnd]);

  // Reading is a single timestamp per user, not a write per message.
  useEffect(() => {
    if (!chatId || !user) return;
    markChatRead(chatId, user.uid).catch(() => undefined);
  }, [chatId, user, messages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !user || !chatId || sending) return;

    setSending(true);
    setInput('');
    try {
      await sendMessage({ chatId, content, senderId: user.uid, messageType: 'text' });
      scrollToEnd();
    } catch (sendError: any) {
      setInput(content);
      setError(sendError?.message ?? 'Message did not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const isMine = (message: Message) => message.senderId === user?.uid;

  const isReadByEveryone = (message: Message) => {
    if (!chat || !user) return false;
    const others = chat.participants.filter((uid) => uid !== user.uid);
    if (others.length === 0) return true;
    const sentAt = toMillis(message.createdAt);
    if (!sentAt) return false;
    return others.every((uid) => {
      const readAt = toMillis(chat.lastReadAt?.[uid]);
      return readAt !== null && readAt >= sentAt;
    });
  };

  const sport = event ? getSport(event.sport) : null;
  const headerTitle = event?.title ?? chat?.activityTitle ?? 'Group chat';
  const headerSub = event
    ? `${formatDayLabel(event.startAt)} · ${formatWindow(event.startAt, event.endAt)} · ${
        event.participantIds.length
      }/${event.capacity}`
    : 'Plan chat';

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
            <View style={styles.headerTitleRow}>
              {sport ? <Text style={styles.headerEmoji}>{sport.emoji}</Text> : null}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerTitle}
              </Text>
            </View>
            <Text style={styles.headerSub} numberOfLines={1}>
              {headerSub}
            </Text>
          </View>

          {event ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={event.venueName ? 'View plan' : 'Suggest a venue'}
              onPress={() =>
                event.venueName
                  ? router.push('/plans' as never)
                  : router.push(`/venue-picker?eventId=${event.id}` as never)
              }
              style={styles.headerAction}>
              <Ionicons
                name={event.venueName ? 'people-outline' : 'location-outline'}
                size={20}
                color={Brand.ink}
              />
            </Pressable>
          ) : (
            <View style={styles.headerAction} />
          )}
        </View>

        {event?.venueName ? (
          <View style={styles.venueBar}>
            <Ionicons name="location-outline" size={14} color={Brand.ink} />
            <Text style={styles.venueText} numberOfLines={1}>
              {event.venueName}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.coral} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {messages.map((message, index) => {
              if (message.messageType === 'system') {
                return (
                  <View key={message.id} style={styles.systemRow}>
                    <Text style={styles.systemText}>{message.content}</Text>
                  </View>
                );
              }

              const mine = isMine(message);
              const showDate = isNewDay(messages, index);

              return (
                <View key={message.id} style={styles.messageBlock}>
                  {showDate ? (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateText}>{formatDate(message.createdAt)}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                    {!mine ? (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{senderInitial(message)}</Text>
                      </View>
                    ) : null}

                    <View style={[styles.bubbleColumn, mine && styles.bubbleColumnMine]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                        <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                          {message.content}
                        </Text>
                      </View>
                      <View style={[styles.metaRow, mine && styles.metaRowMine]}>
                        <Text style={[styles.time, mine && styles.timeMine]}>
                          {formatTime(message.createdAt)}
                        </Text>
                        {mine ? (
                          <Ionicons
                            name={isReadByEveryone(message) ? 'checkmark-done' : 'checkmark'}
                            size={13}
                            color={isReadByEveryone(message) ? Brand.lime : 'rgba(255,255,255,0.75)'}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {messages.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>Say hello and lock in the details.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {error ? (
          <Pressable onPress={() => setError(null)} style={styles.errorBar}>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Message your squad…"
              placeholderTextColor={Brand.inkSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              maxLength={500}
              returnKeyType="send"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={handleSend}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function isNewDay(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const previous = toDate(messages[index - 1].createdAt);
  const current = toDate(messages[index].createdAt);
  if (!previous || !current) return false;
  return previous.toDateString() !== current.toDateString();
}

function senderInitial(message: Message): string {
  return message.senderId.slice(-1).toUpperCase();
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toMillis(value: any): number | null {
  const date = toDate(value);
  return date ? date.getTime() : null;
}

function formatTime(value: any): string {
  const date = toDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(value: any): string {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 16 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: Brand.ink },
  headerSub: { fontSize: 11, color: Brand.inkSecondary },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.limeSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  venueText: { flex: 1, fontSize: 12, fontWeight: '600', color: Brand.ink },
  scroll: { flex: 1 },
  messages: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  messageBlock: { gap: 6 },
  systemRow: { alignItems: 'center', marginVertical: 6 },
  systemText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: Brand.inkSecondary,
    backgroundColor: '#EFEAE1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    textAlign: 'center',
  },
  dateSeparator: { alignItems: 'center', marginVertical: 8 },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Brand.inkSecondary,
    backgroundColor: '#EFEAE1',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: Brand.ink },
  bubbleColumn: { maxWidth: '76%', gap: 3 },
  bubbleColumnMine: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  bubbleMine: { backgroundColor: Brand.coral, borderBottomRightRadius: 5 },
  bubbleTheirs: {
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderBottomLeftRadius: 5,
  },
  messageText: { fontSize: 15, lineHeight: 21, color: Brand.ink },
  messageTextMine: { color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaRowMine: { justifyContent: 'flex-end' },
  time: { fontSize: 10, color: Brand.inkSecondary },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: Brand.inkSecondary },
  errorBar: {
    backgroundColor: '#FDECEA',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: { fontSize: 12, lineHeight: 16, color: Brand.coralDark },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 14,
    marginBottom: 12,
    marginTop: 6,
    gap: 8,
  },
  input: { flex: 1, color: Brand.ink, fontSize: 15, paddingVertical: 6 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Brand.line },
});
