import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToChats, Chat } from '@/firebase/chat';

export default function PlansScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    start?: string;
    end?: string;
    activity?: string;
  }>();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const hasIntent = Boolean(params.activity ?? params.date);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToChats(user.uid, (rawChats) => {
      setChats(rawChats);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const renderItem = ({ item }: { item: Chat }) => {
    const otherId = item.participants.find((id) => id !== user?.uid);
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={`Chat ${item.activityTitle || 'conversation'}`}
        onPress={() => router.push(`/chat/${item.id}` as never)}
        style={styles.chatItem}>
        <View style={styles.chatItemLeft}>
          <View style={styles.avatar}>
            <ThemedText type="smallBold" style={styles.avatarText} themeColor="text">
              {otherId ? otherId.charAt(0).toUpperCase() : '?'}
            </ThemedText>
          </View>
          <View style={styles.chatItemInfo}>
            <ThemedText
              type="smallBold"
              style={styles.chatItemTitle}
              themeColor="text"
            >
              {item.activityTitle || 'Event chat'}
            </ThemedText>
            <ThemedText
              type="small"
              style={styles.chatItemSub}
              themeColor="textSecondary"
              numberOfLines={1}
            >
              {item.lastMessage || 'Start the conversation'}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="small"
          style={styles.chatItemTime}
          themeColor="textSecondary"
        >
          {item.lastMessageAt
            ? new Date(item.lastMessageAt.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--:--'}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title} themeColor="text">
              Plans
            </ThemedText>
            <ThemedText
              type="small"
              style={styles.subtitle}
              themeColor="textSecondary"
            >
              {hasIntent
                ? `${params.activity} · squad ready to chat`
                : 'Your upcoming squads and invites will live here.'}
            </ThemedText>
          </View>

          {/* Active intent card */}
          {hasIntent && (
            <View style={styles.intentCard}>
              <ThemedText type="smallBold" style={styles.intentActivity} themeColor="text">
                {params.activity}
              </ThemedText>
              <ThemedText
                type="small"
                style={styles.intentMeta}
                themeColor="textSecondary"
              >
                {[params.date, params.start && params.end ? `${params.start} – ${params.end}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
              <ThemedText
                type="small"
                style={styles.intentHint}
                themeColor="textSecondary"
              >
                Squad found — open the chat below to discuss the event.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open group chat"
                onPress={() => {
                  // Placeholder: in a real flow this would match with the event creator
                  // and open the group chat for this activity
                }}
                style={styles.openChatBtn}>
                <ThemedText type="smallBold" style={styles.openChatText} themeColor="text">
                  Open chat
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* Chat section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText
                type="smallBold"
                style={styles.sectionTitle}
                themeColor="textSecondary"
              >
                Messages
              </ThemedText>
              <ThemedText
                type="small"
                style={styles.sectionSub}
                themeColor="textSecondary"
              >
                {chats.length} conversation{chats.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>

            {loading ? (
              <View style={styles.loading}>
                <ThemedText type="small" themeColor="textSecondary">
                  Loading messages…
                </ThemedText>
              </View>
            ) : chats.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={40} color={Brand.inkSecondary} />
                <ThemedText type="smallBold" style={styles.emptyTitle} themeColor="text">
                  No conversations yet
                </ThemedText>
                <ThemedText type="small" style={styles.emptySub} themeColor="textSecondary">
                  Chat with event organizers here once you match with an event.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={chats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    gap: 6,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.inkSecondary,
  },
  intentCard: {
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 6,
  },
  intentActivity: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.ink,
  },
  intentMeta: {
    fontSize: 13,
    color: Brand.inkSecondary,
  },
  intentHint: {
    fontSize: 13,
    lineHeight: 18,
    color: Brand.inkSecondary,
  },
  openChatBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  openChatText: {
    color: Brand.coral,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 12,
    color: Brand.inkSecondary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chatItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.ink,
  },
  chatItemInfo: {
    flex: 1,
  },
  chatItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  chatItemSub: {
    fontSize: 13,
    color: Brand.inkSecondary,
    marginTop: 2,
  },
  chatItemTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.inkSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Brand.line,
  },
  listContent: {
    paddingBottom: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.ink,
  },
  emptySub: {
    fontSize: 14,
    color: Brand.inkSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
