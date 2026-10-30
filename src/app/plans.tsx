import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';

export default function PlansScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    start?: string;
    end?: string;
    activity?: string;
  }>();
  const hasIntent = Boolean(params.activity ?? params.date);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.body} edges={['top']}>
        <Text style={styles.title}>Plans</Text>
        <Text style={styles.subtitle}>
          {hasIntent
            ? `${params.activity} · squad ready to chat`
            : 'Your upcoming squads and invites will live here.'}
        </Text>
        {hasIntent ? (
          <View style={styles.intentCard}>
            <Text style={styles.intentActivity}>{params.activity}</Text>
            <Text style={styles.intentMeta}>
              {[params.date, params.start && params.end ? `${params.start} – ${params.end}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.intentHint}>
              Squad found — this is where the group chat opens. Everyone sees the same time,
              venue, and plan.
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: Brand.inkSecondary, marginTop: 6 },
  intentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 4,
  },
  intentActivity: { fontSize: 16, fontWeight: '700', color: Brand.ink },
  intentMeta: { fontSize: 13, color: Brand.inkSecondary },
  intentHint: { fontSize: 13, lineHeight: 18, color: Brand.inkSecondary, marginTop: 8 },
});
