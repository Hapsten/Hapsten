import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { createOpenEvent } from '@/firebase/events';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { buildWindow, defaultDayOffset, defaultStartMinutes, isWindowInFuture } from '@/lib/plan-time';

export default function CreateEventScreen() {
  const { user } = useAuth();
  const location = useCurrentLocation();
  const requestLocation = location.request;
  const [form, setForm] = useState<PlanFormValue>({
    sport: 'football',
    dayOffset: defaultDayOffset(),
    startMinutes: defaultStartMinutes(),
    durationMin: 90,
    radiusKm: 15,
    skillLevel: 'any',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const { startAt, endAt } = buildWindow(form.dayOffset, form.startMinutes, form.durationMin);
  const canCreate = Boolean(user) && Boolean(location.coords) && isWindowInFuture(startAt) && !creating;

  const handleCreate = async () => {
    if (!user) {
      router.replace('/auth' as never);
      return;
    }
    if (!location.coords) {
      setError('Set your location so players know where the plan is.');
      location.request();
      return;
    }
    if (!isWindowInFuture(startAt)) {
      setError('Pick a time at least 5 minutes from now.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const eventId = await createOpenEvent({
        uid: user.uid,
        sport: form.sport,
        startAt,
        endAt,
        geo: new GeoPoint(location.coords.latitude, location.coords.longitude),
        areaLabel: location.label || 'Nearby',
        radiusKm: form.radiusKm,
        skillLevel: form.skillLevel,
      });
      router.replace(`/chat/${eventId}` as never);
    } catch (createError: any) {
      setError(createError?.message ?? 'Could not create the plan. Try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.body} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={Brand.ink} />
          </Pressable>
          <Text style={styles.title}>Host a plan</Text>
          <Text style={styles.subtitle}>
            Pick a sport and a window. We&apos;ll open one group chat for everyone who joins.
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <LocationCard
            label={location.label}
            status={location.status}
            error={location.error}
            onRequest={location.request}
          />

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
            <Ionicons name="lock-closed-outline" size={15} color={Brand.ink} />
            <Text style={styles.noteText}>
              No payments yet — you&apos;ll suggest a venue and settle the court fee with your
              squad.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView style={styles.ctaWrap} edges={['bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create plan and open chat"
          onPress={handleCreate}
          disabled={!canCreate}
          style={({ pressed }) => [
            styles.cta,
            !canCreate && styles.ctaDisabled,
            pressed && canCreate && styles.pressed,
          ]}>
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.ctaText}>Create · Open chat</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  body: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 18,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, color: Brand.inkSecondary },
  error: {
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
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#4A4A3A',
  },
  ctaWrap: { backgroundColor: Brand.cream, paddingHorizontal: 20, paddingTop: 8 },
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
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: Brand.line,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
