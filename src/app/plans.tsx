import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { getSport } from '@/constants/sports';
import { Brand } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { joinEvent, subscribeToMyEvents, subscribeToOpenEvents } from '@/firebase/events';
import { cancelIntent, subscribeToMyIntent } from '@/firebase/intents';
import { formatDayLabel, formatWindow } from '@/lib/plan-time';
import type { Intent, SportEvent } from '@/types/models';

export default function PlansScreen() {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<SportEvent[]>([]);
  const [openEvents, setOpenEvents] = useState<SportEvent[]>([]);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubMine = subscribeToMyEvents(
      user.uid,
      (events) => {
        setMyEvents(events);
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubOpen = subscribeToOpenEvents(
      setOpenEvents,
      () => undefined,
    );
    const unsubIntent = subscribeToMyIntent(user.uid, setIntent, () => undefined);

    return () => {
      unsubMine();
      unsubOpen();
      unsubIntent();
    };
  }, [user]);

  const handleJoin = async (event: SportEvent) => {
    if (!user) return;
    setJoiningId(event.id);
    try {
      await joinEvent(event.id, user.uid);
      router.push(`/chat/${event.id}` as never);
    } catch (joinError: any) {
      Alert.alert('Could not join', joinError?.message ?? 'Try again.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleCancelIntent = async () => {
    if (!intent) return;
    try {
      await cancelIntent(intent.id);
      setIntent(null);
    } catch (cancelError: any) {
      Alert.alert('Could not cancel', cancelError?.message ?? 'Try again.');
    }
  };

  const joinable = openEvents.filter(
    (event) => user && !event.participantIds.includes(user.uid),
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Plans</Text>
            <Text style={styles.subtitle}>
              Your squads, active searches, and open plans.
            </Text>
          </View>

          {intent ? (
            <View style={styles.searchCard}>
              <View style={styles.searchTop}>
                <Text style={styles.searchEmoji}>{getSport(intent.sport).emoji}</Text>
                <View style={styles.searchInfo}>
                  <Text style={styles.searchTitle}>
                    Searching for {getSport(intent.sport).label.toLowerCase()}
                  </Text>
                  <Text style={styles.searchMeta}>
                    {formatDayLabel(intent.startAt)} ·{' '}
                    {formatWindow(intent.startAt, intent.endAt)} · {intent.radiusKm} km
                  </Text>
                </View>
                <View style={styles.pulseDot} />
              </View>
              <View style={styles.searchActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View search"
                  onPress={() => router.push('/searching' as never)}
                  style={({ pressed }) => [styles.smallPrimary, pressed && styles.pressed]}>
                  <Text style={styles.smallPrimaryText}>View search</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel search"
                  onPress={handleCancelIntent}
                  style={({ pressed }) => [styles.smallGhost, pressed && styles.pressed]}>
                  <Text style={styles.smallGhostText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <SectionHeader title="My plans" count={myEvents.length} />
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={Brand.coral} />
            </View>
          ) : myEvents.length === 0 ? (
            <Empty
              icon="calendar-outline"
              title="No plans yet"
              body="Post an intent or join an open plan to get a group chat."
            />
          ) : (
            myEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/chat/${event.id}` as never)}
              />
            ))
          )}

          <SectionHeader title="Open plans" count={joinable.length} />
          {joinable.length === 0 ? (
            <Empty
              icon="people-outline"
              title="No open plans"
              body="Host one with the + button, or post an intent and let the matcher find players."
            />
          ) : (
            joinable.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                action={{
                  label: joiningId === event.id ? 'Joining…' : 'Join',
                  busy: joiningId === event.id,
                  onPress: () => handleJoin(event),
                }}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={Brand.inkSecondary} />
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
    </View>
  );
}

function EventCard({
  event,
  onPress,
  action,
}: {
  event: SportEvent;
  onPress?: () => void;
  action?: { label: string; busy?: boolean; onPress: () => void };
}) {
  const sport = getSport(event.sport);
  const statusLabel =
    event.status === 'forming'
      ? 'Looking for players'
      : event.status === 'confirmed'
        ? 'Confirmed'
        : event.status === 'venue_selected'
          ? 'Venue set'
          : event.status;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${formatDayLabel(event.startAt)}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardEmoji}>{sport.emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {formatDayLabel(event.startAt)} · {formatWindow(event.startAt, event.endAt)}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {event.areaLabel} · {event.participantIds.length}/{event.capacity} players
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            event.status === 'confirmed' && styles.statusPillConfirmed,
          ]}>
          <Text
            style={[
              styles.statusText,
              event.status === 'confirmed' && styles.statusTextConfirmed,
            ]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          disabled={action.busy}
          style={({ pressed }) => [
            styles.joinButton,
            action.busy && styles.joinButtonBusy,
            pressed && styles.pressed,
          ]}>
          {action.busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.joinText}>{action.label}</Text>
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: {
    gap: 6,
    marginBottom: 18,
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
  searchCard: {
    backgroundColor: Brand.limeSoft,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  searchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchEmoji: {
    fontSize: 24,
  },
  searchInfo: {
    flex: 1,
    gap: 2,
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.ink,
  },
  searchMeta: {
    fontSize: 12,
    color: '#4A4A3A',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.coral,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallPrimary: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  smallGhost: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(28,27,26,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallGhostText: {
    color: Brand.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Brand.inkSecondary,
  },
  sectionCount: {
    fontSize: 12,
    color: Brand.inkSecondary,
  },
  card: {
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.ink,
  },
  cardMeta: {
    fontSize: 12,
    color: Brand.inkSecondary,
  },
  statusPill: {
    backgroundColor: '#F1EDE4',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillConfirmed: {
    backgroundColor: Brand.limeSoft,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.inkSecondary,
  },
  statusTextConfirmed: {
    color: '#3F4A1F',
  },
  joinButton: {
    height: 42,
    borderRadius: 999,
    backgroundColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonBusy: {
    backgroundColor: Brand.coralDark,
  },
  joinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  emptyText: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 17,
    color: Brand.inkSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
