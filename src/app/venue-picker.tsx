import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { getSport } from '@/constants/sports';
import { useAuth } from '@/contexts/AuthContext';
import { getEvent, suggestVenue } from '@/firebase/events';
import { subscribeToVenues } from '@/firebase/venues';
import { distanceKm, formatDistance, toLatLng } from '@/lib/geo';
import type { SportEvent, Venue } from '@/types/models';

export default function VenuePickerScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = useState<SportEvent | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .catch(() => undefined);
  }, [eventId]);

  useEffect(() => {
    const unsubscribe = subscribeToVenues(
      (next) => {
        setVenues(next);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const suggestions = useMemo(() => {
    if (!event) return venues;
    return venues
      .filter((venue) => venue.sports.includes(event.sport))
      .sort((a, b) => {
        const aDistance = venueDistance(event, a);
        const bDistance = venueDistance(event, b);
        return (aDistance ?? Infinity) - (bDistance ?? Infinity);
      });
  }, [event, venues]);

  const handlePick = async (venue: Venue) => {
    if (!eventId || !user) return;
    setSavingId(venue.id);
    setError(null);
    try {
      await suggestVenue(eventId, { id: venue.id, name: venue.name }, user.uid);
      router.back();
    } catch (suggestError: any) {
      setError(suggestError?.message ?? 'Could not suggest this venue.');
      setSavingId(null);
    }
  };

  const sport = event ? getSport(event.sport) : null;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Brand.ink} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Suggest a venue</Text>
            <Text style={styles.subtitle}>
              {sport ? `${sport.label} courts near ${event?.areaLabel ?? 'you'}` : 'Nearby venues'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.coral} />
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="business-outline" size={40} color={Brand.inkSecondary} />
            <Text style={styles.emptyTitle}>No venues listed yet</Text>
            <Text style={styles.emptyBody}>
              Venue data lives in the `venues` collection. Add courts for this sport and they
              will show up here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}>
            {suggestions.map((venue) => {
              const distance = event ? venueDistance(event, venue) : null;
              const busy = savingId === venue.id;
              return (
                <Pressable
                  key={venue.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Suggest ${venue.name}`}
                  onPress={() => handlePick(venue)}
                  disabled={busy}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{venue.name}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {venue.address}
                    </Text>
                    <View style={styles.tagRow}>
                      {distance !== null ? (
                        <Text style={styles.tag}>{formatDistance(distance)} away</Text>
                      ) : null}
                      {venue.courts ? (
                        <Text style={styles.tag}>
                          {venue.courts} court{venue.courts === 1 ? '' : 's'}
                        </Text>
                      ) : null}
                      {typeof venue.pricePerHour === 'number' ? (
                        <Text style={styles.tag}>
                          {venue.currency} {venue.pricePerHour}/hr
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={Brand.coral} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={Brand.inkSecondary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function venueDistance(event: SportEvent, venue: Venue): number | null {
  if (!event.geo || !venue.geo) return null;
  return distanceKm(toLatLng(event.geo), toLatLng(venue.geo));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 12, color: Brand.inkSecondary },
  error: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: Brand.coralDark,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 14,
  },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  cardMeta: { fontSize: 12, color: Brand.inkSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A4A3A',
    backgroundColor: Brand.limeSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: Brand.inkSecondary,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },
});
