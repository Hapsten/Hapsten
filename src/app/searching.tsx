import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAP_STYLE } from '@/constants/map-style';
import { Brand } from '@/constants/theme';
import { getSport } from '@/constants/sports';
import { useAuth } from '@/contexts/AuthContext';
import { cancelIntent, subscribeToIntent, subscribeToMyIntent } from '@/firebase/intents';
import { toLatLng } from '@/lib/geo';
import { formatDayLabel, formatWindow } from '@/lib/plan-time';
import type { Intent, LatLng } from '@/types/models';

export default function SearchingScreen() {
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ intentId?: string }>();
  const [intentId, setIntentId] = useState<string | null>(params.intentId ?? null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  // No id in the URL (for example, returning from Plans): find the live search.
  useEffect(() => {
    if (!user || intentId) return;

    const unsubscribe = subscribeToMyIntent(
      user.uid,
      (next) => {
        if (next) {
          setIntentId(next.id);
          return;
        }
        setIntent(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user, intentId]);

  // Watch the intent document itself so the `matched` transition is visible.
  // A "searching" query would drop the document the moment it gets matched.
  useEffect(() => {
    if (!intentId) return;

    const unsubscribe = subscribeToIntent(
      intentId,
      (next) => {
        setIntent(next);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [intentId]);

  useEffect(() => {
    if (intent?.status === 'matched' && intent.eventId) {
      router.replace(`/chat/${intent.eventId}` as never);
    }
  }, [intent]);

  const handleCancel = async () => {
    if (!intent) return;
    setCancelling(true);
    try {
      await cancelIntent(intent.id);
      router.replace('/discover' as never);
    } catch (cancelError: any) {
      setError(cancelError?.message ?? 'Could not cancel. Try again.');
      setCancelling(false);
    }
  };

  const sport = intent ? getSport(intent.sport) : null;
  const ended = intent?.status === 'cancelled' || intent?.status === 'expired';
  // While auth resolves, or while the first snapshot is in flight for a signed-in
  // user, show the loading state instead of "no active search".
  const showLoading = authLoading || (loading && Boolean(user));

  const center = intent?.geo ? toLatLng(intent.geo) : null;
  const region = center ? regionFor(center, intent?.radiusKm ?? 10) : null;

  const recenter = () => {
    if (region) mapRef.current?.animateToRegion(region, 400);
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
          <Text style={styles.headerTitle}>Finding your squad</Text>
          <View style={styles.backBtn} />
        </View>

        {showLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.coral} />
            <Text style={styles.muted}>Loading your search…</Text>
          </View>
        ) : intent && sport && !ended && center && region ? (
          <View style={styles.body}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapLabel}>Your search area</Text>
              <Text style={styles.mapArea} numberOfLines={1}>
                {intent.areaLabel}
              </Text>
            </View>

            <View style={styles.mapCard}>
              {Platform.OS === 'web' ? (
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={32} color={Brand.inkSecondary} />
                  <Text style={styles.mapFallbackText}>
                    The search map is available in the mobile app.
                  </Text>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  customMapStyle={MAP_STYLE}
                  initialRegion={region}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                  showsCompass={false}
                  toolbarEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  accessibilityLabel={`Map showing your ${sport.label} search within ${intent.radiusKm} km of ${intent.areaLabel}`}>
                  <Circle
                    center={center}
                    radius={intent.radiusKm * 1000}
                    fillColor="rgba(228, 87, 77, 0.14)"
                    strokeColor="rgba(228, 87, 77, 0.6)"
                    strokeWidth={1.5}
                  />
                  <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                    <View style={styles.pin}>
                      <Text style={styles.pinEmoji}>{sport.emoji}</Text>
                    </View>
                  </Marker>
                </MapView>
              )}

              <View style={styles.mapChip} pointerEvents="none">
                <Text style={styles.mapChipEmoji}>{sport.emoji}</Text>
                <Text style={styles.mapChipText}>{sport.label}</Text>
              </View>

              <View style={styles.radiusPill} pointerEvents="none">
                <Ionicons name="radio-outline" size={12} color={Brand.ink} />
                <Text style={styles.radiusText}>{intent.radiusKm} km radius</Text>
              </View>

              {Platform.OS !== 'web' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Recenter on your search area"
                  onPress={recenter}
                  style={({ pressed }) => [styles.recenter, pressed && styles.pressed]}>
                  <Ionicons name="locate-outline" size={18} color={Brand.coral} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.statusCard}>
                <ActivityIndicator color={Brand.coral} />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>Searching nearby…</Text>
                  <Text style={styles.statusBody}>
                    We&apos;ll open a group chat as soon as enough {sport.label.toLowerCase()}{' '}
                    players in your radius pick an overlapping time. You can leave this screen.
                  </Text>
                </View>
              </View>

              <View style={styles.whenCard}>
                <Ionicons name="time-outline" size={18} color={Brand.inkSecondary} />
                <View style={styles.whenText}>
                  <Text style={styles.whenTitle}>
                    {formatDayLabel(intent.startAt)} · {formatWindow(intent.startAt, intent.endAt)}
                  </Text>
                  <Text style={styles.whenSub}>
                    Only your own search circle is shown — other players stay private.
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Meta icon="people-outline" label={`Squad of ${sport.minPlayers}+`} />
                <Meta icon="chatbubbles-outline" label="Group chat included" />
                <Meta icon="location-outline" label={`${intent.radiusKm} km radius`} />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse open plans"
                onPress={() => router.push('/plans' as never)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Ionicons name="calendar-outline" size={18} color={Brand.ink} />
                <Text style={styles.secondaryText}>Browse open plans</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel search"
                onPress={handleCancel}
                disabled={cancelling}
                style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>
                  {cancelling ? 'Cancelling…' : 'Cancel search'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons
              name={ended ? 'time-outline' : 'search-outline'}
              size={44}
              color={Brand.inkSecondary}
            />
            <Text style={styles.emptyTitle}>
              {ended ? 'This search has ended' : 'No active search'}
            </Text>
            <Text style={styles.muted}>
              {ended
                ? 'The window has passed or you cancelled it. Post a new intent to try again.'
                : 'Post an intent and we\u2019ll start looking for players near you.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post an intent"
              onPress={() => router.replace('/discover' as never)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Post an intent</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

/**
 * Region that fits the whole search circle with a little breathing room.
 * 111 km per degree of latitude; the same delta is used for longitude so
 * the circle is never clipped at the edges.
 */
function regionFor(center: LatLng, radiusKm: number) {
  const latitudeDelta = Math.max(0.008, (radiusKm * 2.6) / 111);
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta,
  };
}

function Meta({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={Brand.inkSecondary} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: Brand.ink,
  },
  body: { flex: 1, paddingTop: 4 },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
  },
  mapLabel: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  mapArea: { flexShrink: 1, fontSize: 12, color: Brand.inkSecondary },
  mapCard: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#E9E5DB',
  },
  mapFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  mapFallbackText: {
    fontSize: 13,
    lineHeight: 19,
    color: Brand.inkSecondary,
    textAlign: 'center',
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: { fontSize: 18 },
  mapChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapChipEmoji: { fontSize: 13 },
  mapChipText: { fontSize: 12, fontWeight: '800', color: Brand.ink },
  radiusPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  radiusText: { fontSize: 11, fontWeight: '700', color: Brand.ink },
  recenter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingBottom: 12, gap: 12 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
  },
  statusText: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  statusBody: { fontSize: 13, lineHeight: 19, color: Brand.inkSecondary },
  whenCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Brand.limeSoft,
    borderRadius: 16,
    padding: 14,
  },
  whenText: { flex: 1, gap: 3 },
  whenTitle: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  whenSub: { fontSize: 12, lineHeight: 17, color: Brand.inkSecondary },
  metaRow: { gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: Brand.inkSecondary },
  error: { fontSize: 13, color: Brand.coralDark },
  footer: { paddingTop: 4, paddingBottom: 4 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: Brand.limeSoft,
    marginBottom: 10,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  cancel: { alignItems: 'center', justifyContent: 'center', height: 44 },
  cancelText: { fontSize: 14, fontWeight: '600', color: Brand.inkSecondary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.inkSecondary,
    textAlign: 'center',
  },
  primary: {
    marginTop: 10,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    paddingHorizontal: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
