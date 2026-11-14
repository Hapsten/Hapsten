import { Pressable, StyleSheet, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { subscribeToChats, type Chat } from '@/firebase/chat';

export default function ChatListScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToChats(
      user.uid,
      (nextChats) => {
        setChats(nextChats);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [user]);

  const renderItem = ({ item }: { item: Chat }) => {
    const title = item.activityTitle || 'Group plan';
    const unread = isUnread(item, user?.uid);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open chat for ${title}`}
        onPress={() => router.push(`/chat/${item.id}` as never)}
        style={styles.item}>
        <View style={[styles.avatar, unread && styles.avatarUnread]}>
          <Ionicons
            name="chatbubbles-outline"
            size={20}
            color={unread ? '#fff' : Brand.ink}
          />
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" style={styles.itemName} themeColor="text" numberOfLines={1}>
              {title}
            </ThemedText>
            <ThemedText type="small" style={styles.itemTime} themeColor="textSecondary">
              {formatStamp(item.lastMessageAt)}
            </ThemedText>
          </View>
          <ThemedText
            type="small"
            style={[styles.itemLastMessage, unread && styles.itemLastMessageUnread]}
            themeColor="textSecondary"
            numberOfLines={1}>
            {item.lastMessage || 'Plan chat opened'}
          </ThemedText>
          <ThemedText type="small" style={styles.itemMeta} themeColor="textSecondary">
            {item.participants.length} player{item.participants.length === 1 ? '' : 's'}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle} themeColor="text">
            Messages
          </ThemedText>
          <ThemedText type="small" style={styles.headerSub} themeColor="textSecondary">
            {chats.length} squad chat{chats.length === 1 ? '' : 's'}
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading chats…
            </ThemedText>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={Brand.inkSecondary} />
            <ThemedText type="smallBold" style={styles.emptyTitle} themeColor="text">
              No squad chats yet
            </ThemedText>
            <ThemedText type="small" style={styles.emptySub} themeColor="textSecondary">
              Post an intent or join an open plan — the group chat appears here.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find a squad"
              onPress={() => router.push('/discover' as never)}
              style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.emptyCtaText} themeColor="text">
                Find a squad
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function isUnread(chat: Chat, uid: string | undefined): boolean {
  if (!uid) return false;
  const lastRead = toMillis(chat.lastReadAt?.[uid]);
  const lastMessage = toMillis(chat.lastMessageAt);
  if (!lastMessage) return false;
  return lastRead === null || lastMessage > lastRead;
}

function toMillis(value: any): number | null {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatStamp(value: any): string {
  const millis = toMillis(value);
  if (!millis) return '';
  const date = new Date(millis);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: Brand.inkSecondary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: { backgroundColor: Brand.coral },
  itemInfo: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700', color: Brand.ink },
  itemTime: { fontSize: 11, fontWeight: '600', color: Brand.inkSecondary },
  itemLastMessage: { fontSize: 13, color: Brand.inkSecondary },
  itemLastMessageUnread: { color: Brand.ink, fontWeight: '600' },
  itemMeta: { fontSize: 11, color: Brand.inkSecondary },
  listContent: { paddingBottom: 20 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  emptySub: { fontSize: 14, color: Brand.inkSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: 8,
    backgroundColor: Brand.limeSoft,
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  pressed: { opacity: 0.85 },
});
