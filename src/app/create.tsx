import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';

export default function CreateEventScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.body} edges={['top']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={Brand.ink} />
        </Pressable>
        <Text style={styles.title}>Create event</Text>
        <Text style={styles.subtitle}>
          Pick a time, game, and location — we&apos;ll open a group chat for everyone who joins.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={18} color={Brand.coral} />
            <Text style={styles.rowText}>Today · 5:00 – 7:00 PM</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="football-outline" size={18} color={Brand.coral} />
            <Text style={styles.rowText}>Football · casual kickabout</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={Brand.coral} />
            <Text style={styles.rowText}>Location · Newtown</Text>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.ctaWrap} edges={['bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create event and open chat"
          onPress={() => router.push('/plans' as never)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.ctaText}>Create · Open chat</Text>
        </Pressable>
      </SafeAreaView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: Brand.inkSecondary, marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 15, fontWeight: '600', color: Brand.ink },
  ctaWrap: { backgroundColor: Brand.cream, paddingHorizontal: 20, paddingTop: 8 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    height: 56,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
