import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeoPoint } from 'firebase/firestore';

import { LocationCard } from '@/components/location-card';
import { PlanForm, type PlanFormValue } from '@/components/plan-form';
import { Brand } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { createIntent } from '@/firebase/intents';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { buildWindow, defaultDayOffset, defaultStartMinutes, isWindowInFuture } from '@/lib/plan-time';

const HEADER_IMAGE =
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&q=80&auto=format&fit=crop';

export default function DiscoverScreen() {
  const { user } = useAuth();
  const location = useCurrentLocation();
  const requestLocation = location.request;
  const [form, setForm] = useState<PlanFormValue>({
    sport: 'badminton',
    dayOffset: defaultDayOffset(),
    startMinutes: defaultStartMinutes(),
    durationMin: 120,
    radiusKm: 10,
    skillLevel: 'any',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const { startAt, endAt } = buildWindow(form.dayOffset, form.startMinutes, form.durationMin);
  const canSubmit =
    Boolean(user) && Boolean(location.coords) && isWindowInFuture(startAt) && !submitting;

  const handleSubmit = async () => {
    if (!user) {
      router.replace('/auth' as never);
      return;
    }
    if (!location.coords) {
      setError('Set your location first so we can match players around you.');
      location.request();
      return;
    }
    if (!isWindowInFuture(startAt)) {
      setError('Pick a time at least 5 minutes from now.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const intentId = await createIntent({
        uid: user.uid,
        sport: form.sport,
        startAt,
        endAt,
        geo: new GeoPoint(location.coords.latitude, location.coords.longitude),
        areaLabel: location.label || 'Nearby',
        radiusKm: form.radiusKm,
        skillLevel: form.skillLevel,
      });
      router.push(`/searching?intentId=${intentId}` as never);
    } catch (createError: any) {
      setError(createError?.message ?? 'Could not post your intent. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={{ uri: HEADER_IMAGE }} style={styles.headerImage} contentFit="cover" />
          <View style={styles.headerShade} />
          <SafeAreaView style={styles.headerTop} edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <Text style={styles.headerCaption}>Discover nearby</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What are you up for?</Text>
          <Text style={styles.subtitle}>
            Set your window and sport. We&apos;ll group you with players nearby who want the same.
          </Text>

          <View style={styles.locationBlock}>
            <LocationCard
              label={location.label}
              status={location.status}
              error={location.error}
              onRequest={location.request}
            />
          </View>

          <PlanForm
            value={form}
            onChange={(patch) => {
              setForm((current) => ({ ...current, ...patch }));
              setError(null);
            }}
          />

          {!isWindowInFuture(startAt) ? (
            <Text style={styles.error}>
              That start time has passed. Pick a later time or another day.
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.note}>
            <Text style={styles.noteIcon}>⚡</Text>
            <Text style={styles.noteText}>
              No squad is created until enough players in range want the same sport at an
              overlapping time.
            </Text>
          </View>

          <View style={styles.spacer} />
        </View>
      </ScrollView>

      <SafeAreaView style={styles.ctaWrap} edges={['bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find a squad"
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && styles.ctaDisabled,
            pressed && canSubmit && styles.pressed,
          ]}>
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaIcon}>⌕</Text>
              <Text style={styles.ctaText}>Find a squad</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  header: {
    height: 220,
    backgroundColor: '#2b2b2b',
  },
  headerImage: {
    ...StyleSheet.absoluteFill,
  },
  headerShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  sheet: {
    backgroundColor: Brand.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8D2C6',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.inkSecondary,
    marginTop: 6,
  },
  locationBlock: {
    marginTop: 16,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.coralDark,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.limeSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  noteIcon: {
    fontSize: 15,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#4A4A3A',
  },
  spacer: {
    height: 24,
  },
  ctaWrap: {
    backgroundColor: Brand.cream,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    height: 56,
    shadowColor: Brand.coral,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaDisabled: {
    backgroundColor: Brand.line,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaIcon: {
    color: '#fff',
    fontSize: 17,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
