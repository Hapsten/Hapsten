import { Pressable, StyleSheet, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { subscribeToChats, Chat } from '@/firebase/chat';

type ChatItem = Chat & {
  otherParticipantId: string;
  otherParticipantName: string;
};

export default function ChatListScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToChats(user.uid, (rawChats) => {
      const enriched: ChatItem[] = rawChats.map((chat) => {
        const otherId = chat.participants.find((id) => id !== user!.uid);
        return {
          ...chat,
          otherParticipantId: otherId || '',
          otherParticipantName: otherId
            ? `User ${otherId.slice(-4)}`
            : 'Unknown',
        };
      });
      setChats(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handlePress = (chat: ChatItem) => {
    router.push(`/chat/${chat.id}` as never);
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${item.otherParticipantName}`}
      onPress={() => handlePress(item)}
      style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.avatar}>
          <ThemedText type="smallBold" style={styles.avatarText} themeColor="text">
            {item.otherParticipantName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.itemInfo}>
          <ThemedText type="smallBold" style={styles.itemName} themeColor="text">
            {item.otherParticipantName}
          </ThemedText>
          <ThemedText
            type="small"
            style={styles.itemLastMessage}
            themeColor="textSecondary"
            numberOfLines={1}
          >
            {item.lastMessage || 'Start the conversation'}
          </ThemedText>
        </View>
      </View>
      <View style={styles.itemRight}>
        <ThemedText
          type="small"
          style={styles.itemTime}
          themeColor="textSecondary"
        >
          {item.lastMessageAt
            ? new Date(item.lastMessageAt.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--:--'}
        </ThemedText>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loading}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading messages…
            </ThemedText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle} themeColor="text">
            Messages
          </ThemedText>
          <ThemedText
            type="small"
            style={styles.headerSub}
            themeColor="textSecondary"
          >
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        {chats.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={Brand.inkSecondary} />
            <ThemedText type="smallBold" style={styles.emptyTitle} themeColor="text">
              No conversations yet
            </ThemedText>
            <ThemedText type="small" style={styles.emptySub} themeColor="textSecondary">
              Start a chat from an event to discuss with the organizer.
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: Brand.inkSecondary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.ink,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  itemLastMessage: {
    fontSize: 13,
    color: Brand.inkSecondary,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.inkSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Brand.line,
    marginHorizontal: 20,
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
