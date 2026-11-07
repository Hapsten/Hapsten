import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToChats,
  subscribeToEventChats,
  getOrCreateChat,
  Chat,
} from '@/firebase/chat';

export default function PlansScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    start?: string;
    end?: string;
    activity?: string;
  }>();
  const { user } = useAuth();
  const [myChats, setMyChats] = useState<Chat[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const hasIntent = Boolean(params.activity ?? params.date);

  useEffect(() => {
    if (!user) return;

    // Listen to chats where user is a participant
    const unsub1 = subscribeToChats(user.uid, (rawChats) => {
      setMyChats(rawChats);
    });

    // Listen to all event chats (for discovery by other users)
    const unsub2 = subscribeToEventChats((rawChats) => {
      const events = rawChats.filter(
        (chat) => !chat.participants.includes(user.uid)
      );
      setAvailableEvents(events);
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const handleJoinChat = async (chat: Chat) => {
    if (!user || !chat.activityId) return;
    await getOrCreateChat([user.uid, ...chat.participants], {
      activityId: chat.activityId,
      activityTitle: chat.activityTitle,
    });
    router.push(`/chat/${chat.id}` as never);
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
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

  const renderAvailableEvent = ({ item }: { item: Chat }) => {
    const otherId = item.participants.find((id) => id !== user?.uid);
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={`Join ${item.activityTitle || 'event'}`}
        onPress={() => handleJoinChat(item)}
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
              {item.activityTitle || 'Event'}
            </ThemedText>
            <ThemedText
              type="small"
              style={styles.chatItemSub}
              themeColor="textSecondary"
            >
              Join the group chat
            </ThemedText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Join chat"
          onPress={() => handleJoinChat(item)}
          style={styles.joinBtn}>
          <ThemedText type="smallBold" style={styles.joinText} themeColor="text">
            Join
          </ThemedText>
        </Pressable>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText
            type="smallBold"
            style={styles.sectionTitle}
            themeColor="textSecondary"
          >
            My Chats
          </ThemedText>
          <ThemedText
            type="small"
            style={styles.sectionSub}
            themeColor="textSecondary"
          >
            {myChats.length} conversation{myChats.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderAvailableEventsHeader = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText
          type="smallBold"
          style={styles.sectionTitle}
          themeColor="textSecondary"
        >
          Available Events
        </ThemedText>
        <ThemedText
          type="small"
          style={styles.sectionSub}
          themeColor="textSecondary"
        >
          {availableEvents.length} event{availableEvents.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyWrapper}>
          <ThemedText type="small" themeColor="textSecondary">
            Loading…
          </ThemedText>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrapper}>
        <Ionicons name="chatbubbles-outline" size={40} color={Brand.inkSecondary} />
        <ThemedText type="smallBold" style={styles.emptyTitle} themeColor="text">
          No conversations yet
        </ThemedText>
        <ThemedText type="small" style={styles.emptySub} themeColor="textSecondary">
          Create an event or join one to start chatting.
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <FlatList
          data={myChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            <>
              {availableEvents.length > 0 && renderAvailableEventsHeader()}
              <FlatList
                data={availableEvents}
                renderItem={renderAvailableEvent}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
              />
            </>
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
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
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 20,
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
  joinBtn: {
    backgroundColor: Brand.coral,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: Brand.line,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyWrapper: {
    paddingVertical: 60,
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
  listFooter: {
    height: 20,
  },
});
